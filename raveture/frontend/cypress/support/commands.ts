/// <reference types="cypress" />

// ***********************************************
// Custom commands for RAVETURE E2E tests
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login via API and set tokens
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to logout and clear tokens
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Custom command to register a new user
       * @example cy.register('Test User', 'test@example.com', 'password123')
       */
      register(name: string, email: string, password: string): Chainable<void>;

      /**
       * Custom command to create an event as organizer
       * @example cy.createEvent(eventData)
       */
      createEvent(eventData: any): Chainable<void>;

      /**
       * Custom command to seed test data
       * @example cy.seedTestData()
       */
      seedTestData(): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('ravetureApiUrl')}/api/v1/login`,
    body: { email, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('access_token');
    expect(response.body).to.have.property('refresh_token');

    // Store tokens in localStorage
    window.localStorage.setItem('access_token', response.body.access_token);
    window.localStorage.setItem('refresh_token', response.body.refresh_token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

// Logout command
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
  window.localStorage.removeItem('user');
});

// Register command
Cypress.Commands.add('register', (name: string, email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('ravetureApiUrl')}/api/v1/register`,
    body: { name, email, password },
  }).then((response) => {
    expect(response.status).to.eq(201);
    expect(response.body).to.have.property('access_token');
  });
});

// Create event command
Cypress.Commands.add('createEvent', (eventData: any) => {
  const token = window.localStorage.getItem('access_token');
  cy.request({
    method: 'POST',
    url: `${Cypress.env('ravetureApiUrl')}/api/v1/events`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: eventData,
  }).then((response) => {
    expect(response.status).to.eq(201);
  });
});

// Seed test data command
Cypress.Commands.add('seedTestData', () => {
  // This would call a dedicated seed endpoint or script
  cy.log('Seeding test data...');
  // Implementation would depend on your backend setup
});

export {};
