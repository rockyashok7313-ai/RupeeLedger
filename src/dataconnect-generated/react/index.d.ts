import { CreateUserData, CreateUserVariables, CreateCheckInData, CreateCheckInVariables, ListFacilityChambersData, ListFacilityChambersVariables, GetUserCheckInsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUser(options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;
export function useCreateUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserData, FirebaseError, CreateUserVariables>): UseDataConnectMutationResult<CreateUserData, CreateUserVariables>;

export function useCreateCheckIn(options?: useDataConnectMutationOptions<CreateCheckInData, FirebaseError, CreateCheckInVariables>): UseDataConnectMutationResult<CreateCheckInData, CreateCheckInVariables>;
export function useCreateCheckIn(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCheckInData, FirebaseError, CreateCheckInVariables>): UseDataConnectMutationResult<CreateCheckInData, CreateCheckInVariables>;

export function useListFacilityChambers(vars: ListFacilityChambersVariables, options?: useDataConnectQueryOptions<ListFacilityChambersData>): UseDataConnectQueryResult<ListFacilityChambersData, ListFacilityChambersVariables>;
export function useListFacilityChambers(dc: DataConnect, vars: ListFacilityChambersVariables, options?: useDataConnectQueryOptions<ListFacilityChambersData>): UseDataConnectQueryResult<ListFacilityChambersData, ListFacilityChambersVariables>;

export function useGetUserCheckIns(options?: useDataConnectQueryOptions<GetUserCheckInsData>): UseDataConnectQueryResult<GetUserCheckInsData, undefined>;
export function useGetUserCheckIns(dc: DataConnect, options?: useDataConnectQueryOptions<GetUserCheckInsData>): UseDataConnectQueryResult<GetUserCheckInsData, undefined>;
