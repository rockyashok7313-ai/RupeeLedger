# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListFacilityChambers*](#listfacilitychambers)
  - [*GetUserCheckIns*](#getusercheckins)
- [**Mutations**](#mutations)
  - [*CreateUser*](#createuser)
  - [*CreateCheckIn*](#createcheckin)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListFacilityChambers
You can execute the `ListFacilityChambers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listFacilityChambers(vars: ListFacilityChambersVariables, options?: ExecuteQueryOptions): QueryPromise<ListFacilityChambersData, ListFacilityChambersVariables>;

interface ListFacilityChambersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListFacilityChambersVariables): QueryRef<ListFacilityChambersData, ListFacilityChambersVariables>;
}
export const listFacilityChambersRef: ListFacilityChambersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listFacilityChambers(dc: DataConnect, vars: ListFacilityChambersVariables, options?: ExecuteQueryOptions): QueryPromise<ListFacilityChambersData, ListFacilityChambersVariables>;

interface ListFacilityChambersRef {
  ...
  (dc: DataConnect, vars: ListFacilityChambersVariables): QueryRef<ListFacilityChambersData, ListFacilityChambersVariables>;
}
export const listFacilityChambersRef: ListFacilityChambersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listFacilityChambersRef:
```typescript
const name = listFacilityChambersRef.operationName;
console.log(name);
```

### Variables
The `ListFacilityChambers` query requires an argument of type `ListFacilityChambersVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListFacilityChambersVariables {
  facilityId: UUIDString;
}
```
### Return Type
Recall that executing the `ListFacilityChambers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListFacilityChambersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListFacilityChambersData {
  chambers: ({
    chamberName: string;
    status: string;
    lastServicedDate?: DateString | null;
  })[];
}
```
### Using `ListFacilityChambers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listFacilityChambers, ListFacilityChambersVariables } from '@dataconnect/generated';

// The `ListFacilityChambers` query requires an argument of type `ListFacilityChambersVariables`:
const listFacilityChambersVars: ListFacilityChambersVariables = {
  facilityId: ..., 
};

// Call the `listFacilityChambers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listFacilityChambers(listFacilityChambersVars);
// Variables can be defined inline as well.
const { data } = await listFacilityChambers({ facilityId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listFacilityChambers(dataConnect, listFacilityChambersVars);

console.log(data.chambers);

// Or, you can use the `Promise` API.
listFacilityChambers(listFacilityChambersVars).then((response) => {
  const data = response.data;
  console.log(data.chambers);
});
```

### Using `ListFacilityChambers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listFacilityChambersRef, ListFacilityChambersVariables } from '@dataconnect/generated';

// The `ListFacilityChambers` query requires an argument of type `ListFacilityChambersVariables`:
const listFacilityChambersVars: ListFacilityChambersVariables = {
  facilityId: ..., 
};

// Call the `listFacilityChambersRef()` function to get a reference to the query.
const ref = listFacilityChambersRef(listFacilityChambersVars);
// Variables can be defined inline as well.
const ref = listFacilityChambersRef({ facilityId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listFacilityChambersRef(dataConnect, listFacilityChambersVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.chambers);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.chambers);
});
```

## GetUserCheckIns
You can execute the `GetUserCheckIns` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserCheckIns(options?: ExecuteQueryOptions): QueryPromise<GetUserCheckInsData, undefined>;

interface GetUserCheckInsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUserCheckInsData, undefined>;
}
export const getUserCheckInsRef: GetUserCheckInsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserCheckIns(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUserCheckInsData, undefined>;

interface GetUserCheckInsRef {
  ...
  (dc: DataConnect): QueryRef<GetUserCheckInsData, undefined>;
}
export const getUserCheckInsRef: GetUserCheckInsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserCheckInsRef:
```typescript
const name = getUserCheckInsRef.operationName;
console.log(name);
```

### Variables
The `GetUserCheckIns` query has no variables.
### Return Type
Recall that executing the `GetUserCheckIns` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserCheckInsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserCheckInsData {
  checkIns: ({
    checkInId: string;
    startTime: TimestampString;
    chamber: {
      chamberName: string;
    };
  })[];
}
```
### Using `GetUserCheckIns`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserCheckIns } from '@dataconnect/generated';


// Call the `getUserCheckIns()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserCheckIns();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserCheckIns(dataConnect);

console.log(data.checkIns);

// Or, you can use the `Promise` API.
getUserCheckIns().then((response) => {
  const data = response.data;
  console.log(data.checkIns);
});
```

### Using `GetUserCheckIns`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserCheckInsRef } from '@dataconnect/generated';


// Call the `getUserCheckInsRef()` function to get a reference to the query.
const ref = getUserCheckInsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserCheckInsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.checkIns);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.checkIns);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUser
You can execute the `CreateUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUser(vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUser(dc: DataConnect, vars: CreateUserVariables): MutationPromise<CreateUserData, CreateUserVariables>;

interface CreateUserRef {
  ...
  (dc: DataConnect, vars: CreateUserVariables): MutationRef<CreateUserData, CreateUserVariables>;
}
export const createUserRef: CreateUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserRef:
```typescript
const name = createUserRef.operationName;
console.log(name);
```

### Variables
The `CreateUser` mutation requires an argument of type `CreateUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserVariables {
  name: string;
  clearanceLevel: number;
  userId: string;
}
```
### Return Type
Recall that executing the `CreateUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserData {
  user_insert: User_Key;
}
```
### Using `CreateUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUser, CreateUserVariables } from '@dataconnect/generated';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  name: ..., 
  clearanceLevel: ..., 
  userId: ..., 
};

// Call the `createUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUser(createUserVars);
// Variables can be defined inline as well.
const { data } = await createUser({ name: ..., clearanceLevel: ..., userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUser(dataConnect, createUserVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUser(createUserVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserRef, CreateUserVariables } from '@dataconnect/generated';

// The `CreateUser` mutation requires an argument of type `CreateUserVariables`:
const createUserVars: CreateUserVariables = {
  name: ..., 
  clearanceLevel: ..., 
  userId: ..., 
};

// Call the `createUserRef()` function to get a reference to the mutation.
const ref = createUserRef(createUserVars);
// Variables can be defined inline as well.
const ref = createUserRef({ name: ..., clearanceLevel: ..., userId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserRef(dataConnect, createUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## CreateCheckIn
You can execute the `CreateCheckIn` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createCheckIn(vars: CreateCheckInVariables): MutationPromise<CreateCheckInData, CreateCheckInVariables>;

interface CreateCheckInRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateCheckInVariables): MutationRef<CreateCheckInData, CreateCheckInVariables>;
}
export const createCheckInRef: CreateCheckInRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createCheckIn(dc: DataConnect, vars: CreateCheckInVariables): MutationPromise<CreateCheckInData, CreateCheckInVariables>;

interface CreateCheckInRef {
  ...
  (dc: DataConnect, vars: CreateCheckInVariables): MutationRef<CreateCheckInData, CreateCheckInVariables>;
}
export const createCheckInRef: CreateCheckInRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createCheckInRef:
```typescript
const name = createCheckInRef.operationName;
console.log(name);
```

### Variables
The `CreateCheckIn` mutation requires an argument of type `CreateCheckInVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateCheckInVariables {
  chamberId: UUIDString;
  userId: UUIDString;
  checkInId: string;
  startTime: TimestampString;
}
```
### Return Type
Recall that executing the `CreateCheckIn` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateCheckInData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateCheckInData {
  checkIn_insert: CheckIn_Key;
}
```
### Using `CreateCheckIn`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createCheckIn, CreateCheckInVariables } from '@dataconnect/generated';

// The `CreateCheckIn` mutation requires an argument of type `CreateCheckInVariables`:
const createCheckInVars: CreateCheckInVariables = {
  chamberId: ..., 
  userId: ..., 
  checkInId: ..., 
  startTime: ..., 
};

// Call the `createCheckIn()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createCheckIn(createCheckInVars);
// Variables can be defined inline as well.
const { data } = await createCheckIn({ chamberId: ..., userId: ..., checkInId: ..., startTime: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createCheckIn(dataConnect, createCheckInVars);

console.log(data.checkIn_insert);

// Or, you can use the `Promise` API.
createCheckIn(createCheckInVars).then((response) => {
  const data = response.data;
  console.log(data.checkIn_insert);
});
```

### Using `CreateCheckIn`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createCheckInRef, CreateCheckInVariables } from '@dataconnect/generated';

// The `CreateCheckIn` mutation requires an argument of type `CreateCheckInVariables`:
const createCheckInVars: CreateCheckInVariables = {
  chamberId: ..., 
  userId: ..., 
  checkInId: ..., 
  startTime: ..., 
};

// Call the `createCheckInRef()` function to get a reference to the mutation.
const ref = createCheckInRef(createCheckInVars);
// Variables can be defined inline as well.
const ref = createCheckInRef({ chamberId: ..., userId: ..., checkInId: ..., startTime: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createCheckInRef(dataConnect, createCheckInVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.checkIn_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.checkIn_insert);
});
```

