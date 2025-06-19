// Type declarations for missing modules

declare module 'passport-google-oauth20' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface Profile {
    id: string;
    displayName: string;
    name?: {
      familyName?: string;
      givenName?: string;
      middleName?: string;
    };
    emails?: Array<{
      value: string;
      type?: string;
    }>;
    photos?: Array<{
      value: string;
    }>;
    provider: string;
    _raw: string;
    _json: any;
  }
  
  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    passReqToCallback?: boolean;
  }
  
  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyCallback
    );
  }
}

declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface Profile {
    id: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
    provider: string;
    _raw: string;
    _json: any;
  }
  
  export interface StrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyLocation: string;
    callbackURL: string;
    scope?: string[];
    passReqToCallback?: boolean;
  }
  
  export type VerifyCallback = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void
  ) => void;
  
  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: VerifyCallback
    );
  }
}