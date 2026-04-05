// =========================
// GLOBAL CONSTANTS
// =========================

export const PROJECT_NAME = 'subscription-cancellation-system';

// =========================
// NAMING PREFIXES
// =========================

export const RESOURCE_PREFIX = 'subsys';

export const LAMBDA_NAMES = {
  CREATE_SCHEDULE: 'create-schedule',
    EXECUTE_CANCELLATION: 'execute-cancellation'
    };

    // =========================
    // SCHEDULER
    // =========================

    export const SCHEDULER = {
      DEFAULT_RETRY_ATTEMPTS: 3,
        MAX_EVENT_AGE_SECONDS: 3600
        };

        // =========================
        // SUBSCRIPTION STATUS
        // =========================

        export const SUBSCRIPTION_STATUS = {
          ACTIVE: 'active',
            CANCELED: 'canceled'
            };

            // =========================
            // API ROUTES
            // =========================

            export const API_ROUTES = {
              CANCEL_SUBSCRIPTION: '/cancel-subscription'
              };

              // =========================
              // LAMBDA DEFAULTS
              // =========================

              export const LAMBDA_DEFAULTS = {
                TIMEOUT: 30,
                  MEMORY_SIZE: 256
                  };

                  // =========================
                  // DYNAMODB
                  // =========================

                  export const DYNAMO = {
                    BILLING_MODE: 'PAY_PER_REQUEST'
                    };