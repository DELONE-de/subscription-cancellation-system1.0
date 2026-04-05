export type Environment = 'dev' | 'staging' | 'prod';

interface EnvConfig {
  account: string;
  region: string;
  tableNames: {
    users: string;
    subscriptions: string;
    notifications: string;
  };
  schedulerGroup: string;
}

const ENV = (process.env.ENV || 'dev') as Environment;

const config: Record<Environment, EnvConfig> = {
  dev: {
    account: '111111111111',
    region: 'us-east-1',
    tableNames: {
      users: 'Users-dev',
      subscriptions: 'Subscriptions-dev',
      notifications: 'Notifications-dev',
    },
    schedulerGroup: 'subscription-cancellations-dev',
  },
  staging: {
    account: '222222222222',
    region: 'us-east-1',
    tableNames: {
      users: 'Users-staging',
      subscriptions: 'Subscriptions-staging',
      notifications: 'Notifications-staging',
    },
    schedulerGroup: 'subscription-cancellations-staging',
  },
  prod: {
    account: '333333333333',
    region: 'us-east-1',
    tableNames: {
      users: 'Users',
      subscriptions: 'Subscriptions',
      notifications: 'Notifications',
    },
    schedulerGroup: 'subscription-cancellations',
  },
};

export const envConfig = config[ENV];
export const currentEnv = ENV;
