import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Alert_Key {
  id: UUIDString;
  __typename?: 'Alert_Key';
}

export interface Chamber_Key {
  id: UUIDString;
  __typename?: 'Chamber_Key';
}

export interface CheckIn_Key {
  id: UUIDString;
  __typename?: 'CheckIn_Key';
}

export interface CreateCheckInData {
  checkIn_insert: CheckIn_Key;
}

export interface CreateCheckInVariables {
  chamberId: UUIDString;
  userId: UUIDString;
  checkInId: string;
  startTime: TimestampString;
}

export interface CreateUserData {
  user_insert: User_Key;
}

export interface CreateUserVariables {
  name: string;
  clearanceLevel: number;
  userId: string;
}

export interface Facility_Key {
  id: UUIDString;
  __typename?: 'Facility_Key';
}

export interface GetUserCheckInsData {
  checkIns: ({
    checkInId: string;
    startTime: TimestampString;
    chamber: {
      chamberName: string;
    };
  })[];
}

export interface ListFacilityChambersData {
  chambers: ({
    chamberName: string;
    status: string;
    lastServicedDate?: DateString | null;
  })[];
}

export interface ListFacilityChambersVariables {
  facilityId: UUIDString;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
  operationName: string;
}
export const createUserRef: CreateUserRef;

export function createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;
export function createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateCheckInRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCheckInVariables): MutationRef<CreateCheckInData, CreateCheckInVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateCheckInVariables): MutationRef<CreateCheckInData, CreateCheckInVariables>;
  operationName: string;
}
export const createCheckInRef: CreateCheckInRef;

export function createCheckIn(vars: CreateCheckInVariables): MutationPromise<CreateCheckInData, CreateCheckInVariables>;
export function createCheckIn(dc: DataConnect, vars: CreateCheckInVariables): MutationPromise<CreateCheckInData, CreateCheckInVariables>;

interface ListFacilityChambersRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListFacilityChambersVariables): QueryRef<ListFacilityChambersData, ListFacilityChambersVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListFacilityChambersVariables): QueryRef<ListFacilityChambersData, ListFacilityChambersVariables>;
  operationName: string;
}
export const listFacilityChambersRef: ListFacilityChambersRef;

export function listFacilityChambers(vars: ListFacilityChambersVariables, options?: ExecuteQueryOptions): QueryPromise<ListFacilityChambersData, ListFacilityChambersVariables>;
export function listFacilityChambers(dc: DataConnect, vars: ListFacilityChambersVariables, options?: ExecuteQueryOptions): QueryPromise<ListFacilityChambersData, ListFacilityChambersVariables>;

interface GetUserCheckInsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserCheckInsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUserCheckInsData, undefined>;
  operationName: string;
}
export const getUserCheckInsRef: GetUserCheckInsRef;

export function getUserCheckIns(options?: ExecuteQueryOptions): QueryPromise<GetUserCheckInsData, undefined>;
export function getUserCheckIns(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserCheckInsData, undefined>;

