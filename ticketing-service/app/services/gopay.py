"""
GoPay Payment Gateway Integration

This module provides integration with the GoPay payment gateway for
processing ticket payments. GoPay is a popular payment provider in
Czech Republic supporting cards, bank transfers, and more.

Documentation: https://doc.gopay.com/
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
import requests
from flask import current_app

logger = logging.getLogger(__name__)


class PaymentState(Enum):
    """GoPay payment states."""
    CREATED = 'CREATED'
    PAYMENT_METHOD_CHOSEN = 'PAYMENT_METHOD_CHOSEN'
    PAID = 'PAID'
    AUTHORIZED = 'AUTHORIZED'
    CANCELED = 'CANCELED'
    TIMEOUTED = 'TIMEOUTED'
    REFUNDED = 'REFUNDED'
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'


class PaymentMethod(Enum):
    """Supported payment methods."""
    PAYMENT_CARD = 'PAYMENT_CARD'
    BANK_ACCOUNT = 'BANK_ACCOUNT'
    GPAY = 'GPAY'
    APPLE_PAY = 'APPLE_PAY'


@dataclass
class PaymentItem:
    """Item in a payment order."""
    name: str
    amount: int  # In minor units (cents/hellers)
    count: int = 1
    vat_rate: int = 21  # VAT rate percentage


@dataclass
class PaymentResult:
    """Result of a payment operation."""
    success: bool
    payment_id: Optional[str] = None
    gateway_url: Optional[str] = None
    state: Optional[str] = None
    error: Optional[str] = None
    raw_response: Optional[Dict] = None


class GopayClient:
    """
    GoPay API Client

    Handles authentication, payment creation, and status checking
    with the GoPay payment gateway.
    """

    def __init__(self, app=None):
        self.app = app
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None

    def _get_config(self) -> Dict[str, Any]:
        """Get GoPay configuration from app config."""
        app = self.app or current_app
        return {
            'client_id': app.config.get('GOPAY_CLIENT_ID'),
            'client_secret': app.config.get('GOPAY_CLIENT_SECRET'),
            'goid': app.config.get('GOPAY_GOID'),
            'gateway_url': app.config.get('GOPAY_GATEWAY_URL', 'https://gw.sandbox.gopay.com'),
            'return_url': app.config.get('GOPAY_RETURN_URL'),
            'notification_url': app.config.get('GOPAY_NOTIFICATION_URL'),
        }

    def _get_access_token(self) -> str:
        """
        Get OAuth access token from GoPay.

        GoPay uses OAuth2 client credentials flow for API authentication.
        Token is cached and refreshed when expired.
        """
        # Return cached token if valid
        if self._access_token and self._token_expires and datetime.utcnow() < self._token_expires:
            return self._access_token

        config = self._get_config()

        if not config['client_id'] or not config['client_secret']:
            raise ValueError("GoPay credentials not configured")

        # Request new token
        auth_url = f"{config['gateway_url']}/api/oauth2/token"

        response = requests.post(
            auth_url,
            data={
                'grant_type': 'client_credentials',
                'scope': 'payment-create payment-all',
            },
            auth=(config['client_id'], config['client_secret']),
            headers={'Accept': 'application/json'},
            timeout=30,
        )

        if response.status_code != 200:
            logger.error(f"GoPay auth failed: {response.text}")
            raise Exception(f"GoPay authentication failed: {response.status_code}")

        data = response.json()
        self._access_token = data['access_token']

        # Token expires in expires_in seconds, refresh 60s early
        from datetime import timedelta
        expires_in = data.get('expires_in', 1800)
        self._token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 60)

        return self._access_token

    def _api_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """Make authenticated API request to GoPay."""
        config = self._get_config()
        token = self._get_access_token()

        url = f"{config['gateway_url']}/api{endpoint}"

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        response = requests.request(
            method=method,
            url=url,
            json=data,
            headers=headers,
            timeout=30,
        )

        return response.json()

    def create_payment(
        self,
        order_number: str,
        amount: int,
        currency: str,
        description: str,
        items: List[PaymentItem],
        payer_email: Optional[str] = None,
        allowed_methods: Optional[List[PaymentMethod]] = None,
    ) -> PaymentResult:
        """
        Create a new payment in GoPay.

        Args:
            order_number: Unique order identifier
            amount: Total amount in minor units (cents/hellers)
            currency: Currency code (CZK, EUR)
            description: Payment description
            items: List of items in the order
            payer_email: Customer email for receipts
            allowed_methods: Allowed payment methods

        Returns:
            PaymentResult with gateway URL for redirect
        """
        config = self._get_config()

        if not config['goid']:
            return PaymentResult(
                success=False,
                error="GoPay GOID not configured"
            )

        # Build items array for GoPay
        gopay_items = [
            {
                'type': 'ITEM',
                'name': item.name[:256],  # Max 256 chars
                'amount': item.amount,
                'count': item.count,
                'vat_rate': item.vat_rate,
            }
            for item in items
        ]

        # Default payment methods if not specified
        if not allowed_methods:
            allowed_methods = [
                PaymentMethod.PAYMENT_CARD,
                PaymentMethod.BANK_ACCOUNT,
                PaymentMethod.GPAY,
            ]

        # Build payment request
        payment_data = {
            'payer': {
                'allowed_payment_instruments': [m.value for m in allowed_methods],
                'default_payment_instrument': PaymentMethod.PAYMENT_CARD.value,
            },
            'amount': amount,
            'currency': currency,
            'order_number': order_number[:128],  # Max 128 chars
            'order_description': description[:256],  # Max 256 chars
            'items': gopay_items,
            'callback': {
                'return_url': f"{config['return_url']}?order={order_number}",
                'notification_url': config['notification_url'],
            },
            'target': {
                'type': 'ACCOUNT',
                'goid': int(config['goid']),
            },
            'lang': 'CS',  # Czech language
        }

        # Add payer email if provided
        if payer_email:
            payment_data['payer']['contact'] = {
                'email': payer_email,
            }

        try:
            response = self._api_request('POST', '/payments/payment', payment_data)

            if 'id' in response:
                return PaymentResult(
                    success=True,
                    payment_id=str(response['id']),
                    gateway_url=response.get('gw_url'),
                    state=response.get('state'),
                    raw_response=response,
                )
            else:
                error_msg = response.get('errors', [{}])[0].get('message', 'Unknown error')
                return PaymentResult(
                    success=False,
                    error=error_msg,
                    raw_response=response,
                )

        except requests.RequestException as e:
            logger.error(f"GoPay request failed: {e}")
            return PaymentResult(
                success=False,
                error=f"Request failed: {str(e)}"
            )

    def get_payment_status(self, payment_id: str) -> PaymentResult:
        """
        Get current status of a payment.

        Args:
            payment_id: GoPay payment ID

        Returns:
            PaymentResult with current state
        """
        try:
            response = self._api_request('GET', f'/payments/payment/{payment_id}')

            if 'id' in response:
                return PaymentResult(
                    success=True,
                    payment_id=str(response['id']),
                    state=response.get('state'),
                    raw_response=response,
                )
            else:
                return PaymentResult(
                    success=False,
                    error='Payment not found',
                    raw_response=response,
                )

        except requests.RequestException as e:
            logger.error(f"GoPay status check failed: {e}")
            return PaymentResult(
                success=False,
                error=f"Request failed: {str(e)}"
            )

    def verify_webhook_signature(
        self,
        payment_id: str,
        received_signature: str
    ) -> bool:
        """
        Verify GoPay webhook callback signature.

        Args:
            payment_id: Payment ID from webhook
            received_signature: Signature from webhook

        Returns:
            True if signature is valid
        """
        config = self._get_config()

        # GoPay signature is HMAC-SHA256 of payment_id with client_secret
        expected = hmac.new(
            config['client_secret'].encode(),
            payment_id.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected, received_signature)

    def refund_payment(
        self,
        payment_id: str,
        amount: int
    ) -> PaymentResult:
        """
        Refund a payment (full or partial).

        Args:
            payment_id: GoPay payment ID to refund
            amount: Amount to refund in minor units

        Returns:
            PaymentResult with refund status
        """
        try:
            response = self._api_request(
                'POST',
                f'/payments/payment/{payment_id}/refund',
                {'amount': amount}
            )

            if response.get('result') == 'FINISHED':
                return PaymentResult(
                    success=True,
                    payment_id=payment_id,
                    state='REFUNDED',
                    raw_response=response,
                )
            else:
                return PaymentResult(
                    success=False,
                    error=response.get('result', 'Refund failed'),
                    raw_response=response,
                )

        except requests.RequestException as e:
            logger.error(f"GoPay refund failed: {e}")
            return PaymentResult(
                success=False,
                error=f"Request failed: {str(e)}"
            )


# Global client instance
gopay_client = GopayClient()
