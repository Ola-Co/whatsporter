// // import { readFileSync } from "fs";
// // import { createDecipheriv, privateDecrypt, constants } from "crypto";

// // // Load private key from PEM file (ensure it's 2048-bit RSA and matches the public key uploaded in WhatsApp)
// // const PRIVATE_KEY = readFileSync("./private_whatsapp.pem", "utf-8");

// // export function decryptPayload(
// //   encryptedPayloadBase64: string
// // ): Record<string, any> {
// //   const encryptedPayload = Buffer.from(encryptedPayloadBase64, "base64");

// //   const ENCRYPTED_AES_KEY_LENGTH = 256; // 2048-bit RSA = 256 bytes
// //   const IV_LENGTH = 12; // AES-GCM IV length
// //   const AUTH_TAG_LENGTH = 16; // AES-GCM Auth Tag length

// //   // Correctly slice the encrypted data (ensure Buffer is used throughout)
// //   const encryptedAesKey = encryptedPayload.slice(0, ENCRYPTED_AES_KEY_LENGTH);
// //   const iv = encryptedPayload.slice(
// //     ENCRYPTED_AES_KEY_LENGTH,
// //     ENCRYPTED_AES_KEY_LENGTH + IV_LENGTH
// //   );
// //   const authTag = encryptedPayload.slice(-AUTH_TAG_LENGTH);
// //   const encryptedData = encryptedPayload.slice(
// //     ENCRYPTED_AES_KEY_LENGTH + IV_LENGTH,
// //     -AUTH_TAG_LENGTH
// //   );

// //   // Decrypt AES key using RSA private key
// //   const aesKey = privateDecrypt(
// //     {
// //       key: PRIVATE_KEY,
// //       padding: constants.RSA_PKCS1_OAEP_PADDING,
// //     },
// //     encryptedAesKey
// //   );

// //   // Decrypt payload using AES-GCM
// //   const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
// //   decipher.setAuthTag(authTag);

// //   const decryptedBuffer = Buffer.concat([
// //     decipher.update(encryptedData),
// //     decipher.final(),
// //   ]);

// //   const decryptedJson = decryptedBuffer.toString("utf8");
// //   return JSON.parse(decryptedJson);
// // }

// import { readFileSync } from "fs";
// import { createDecipheriv, privateDecrypt, constants } from "crypto";

// // Load private key from PEM file (ensure it's 2048-bit RSA and matches the public key uploaded in WhatsApp)
// const PRIVATE_KEY = readFileSync("./private_whatsapp.pem", "utf-8");

// export function decryptPayload(
//   encryptedPayloadBase64: string
// ): Record<string, any> {
//   const encryptedPayload = Buffer.from(encryptedPayloadBase64, "base64");

//   const ENCRYPTED_AES_KEY_LENGTH = 256; // 2048-bit RSA = 256 bytes
//   const IV_LENGTH = 12; // AES-GCM IV length
//   const AUTH_TAG_LENGTH = 16; // AES-GCM Auth Tag length

//   // Correctly slice the encrypted data (ensure Buffer is used throughout)
//   const encryptedAesKey = encryptedPayload.subarray(
//     0,
//     ENCRYPTED_AES_KEY_LENGTH
//   );
//   const iv = encryptedPayload.subarray(
//     ENCRYPTED_AES_KEY_LENGTH,
//     ENCRYPTED_AES_KEY_LENGTH + IV_LENGTH
//   );
//   const authTag = encryptedPayload.subarray(-AUTH_TAG_LENGTH);
//   const encryptedData = encryptedPayload.subarray(
//     ENCRYPTED_AES_KEY_LENGTH + IV_LENGTH,
//     -AUTH_TAG_LENGTH
//   );

//   // Decrypt AES key using RSA private key
//   const aesKey = privateDecrypt(
//     {
//       key: PRIVATE_KEY,
//       padding: constants.RSA_PKCS1_OAEP_PADDING,
//     },
//     encryptedAesKey
//   );

//   // Decrypt payload using AES-GCM
//   const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
//   decipher.setAuthTag(authTag);

//   const decryptedBuffer = Buffer.concat([
//     decipher.update(encryptedData),
//     decipher.final(),
//   ]);

//   const decryptedJson = decryptedBuffer.toString("utf8");
//   return JSON.parse(decryptedJson);
// }
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// import crypto from "crypto";

// export const decryptRequest = (body, privatePem, passphrase) => {
//   const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

//   const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
//   let decryptedAesKey = null;
//   try {
//     // decrypt AES key created by client
//     decryptedAesKey = crypto.privateDecrypt(
//       {
//         key: privateKey,
//         padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
//         oaepHash: "sha256",
//       },
//       Buffer.from(encrypted_aes_key, "base64")
//     );
//   } catch (error) {
//     console.error(error);
//     /*
//     Failed to decrypt. Please verify your private key.
//     If you change your public key. You need to return HTTP status code 421 to refresh the public key on the client
//     */
//     throw new FlowEndpointException(
//       421,
//       "Failed to decrypt the request. Please verify your private key."
//     );
//   }

//   // decrypt flow data
//   const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
//   const initialVectorBuffer = Buffer.from(initial_vector, "base64");

//   const TAG_LENGTH = 16;
//   const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
//   const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

//   const decipher = crypto.createDecipheriv(
//     "aes-128-gcm",
//     decryptedAesKey,
//     initialVectorBuffer
//   );
//   decipher.setAuthTag(encrypted_flow_data_tag);

//   const decryptedJSONString = Buffer.concat([
//     decipher.update(encrypted_flow_data_body),
//     decipher.final(),
//   ]).toString("utf-8");

//   return {
//     decryptedBody: JSON.parse(decryptedJSONString),
//     aesKeyBuffer: decryptedAesKey,
//     initialVectorBuffer,
//   };
// };

// export const encryptResponse = (
//   response,
//   aesKeyBuffer,
//   initialVectorBuffer
// ) => {
//   // flip initial vector
//   const flipped_iv = [];
//   for (const pair of initialVectorBuffer.entries()) {
//     flipped_iv.push(~pair[1]);
//   }

//   // encrypt response data
//   const cipher = crypto.createCipheriv(
//     "aes-128-gcm",
//     aesKeyBuffer,
//     Buffer.from(flipped_iv)
//   );
//   return Buffer.concat([
//     cipher.update(JSON.stringify(response), "utf-8"),
//     cipher.final(),
//     cipher.getAuthTag(),
//   ]).toString("base64");
// };

// export const FlowEndpointException = class FlowEndpointException extends Error {
//   constructor(statusCode, message) {
//     super(message);

//     this.name = this.constructor.name;
//     this.statusCode = statusCode;
//   }
// };
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import crypto from "crypto";
import { readFileSync } from "fs";

interface EncryptedRequestBody {
  encrypted_aes_key: string;
  encrypted_flow_data: string;
  initial_vector: string;
}

interface DecryptedResponse {
  decryptedBody: Record<string, unknown>;
  aesKeyBuffer: Buffer;
  initialVectorBuffer: Buffer;
}

export interface FlowResponse {
  screen?: string;
  data?: {
    status?: string;
    acknowledged?: boolean;
    greeting?: string;
    extension_message_response?: {
      params: {
        flow_token?: string;
      };
    };
    [key: string]: unknown;
  };
}
export const decryptRequest = (
  body: EncryptedRequestBody
  // privatePem: string,
  // passphrase?: string
): DecryptedResponse => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  //const privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
  const privateKey = readFileSync("./private_whatsapp.pem", "utf-8");
  let decryptedAesKey: Buffer;
  try {
    // decrypt AES key created by client
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encrypted_aes_key, "base64")
    );
  } catch (error) {
    console.error(error);
    /*
    Failed to decrypt. Please verify your private key.
    If you change your public key. You need to return HTTP status code 421 to refresh the public key on the client
    */
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key."
    );
  }

  // decrypt flow data
  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv(
    "aes-128-gcm",
    decryptedAesKey,
    initialVectorBuffer
  );
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
};

export const encryptResponse = (
  response: FlowResponse,
  aesKeyBuffer: Buffer,
  initialVectorBuffer: Buffer
): string => {
  // flip initial vector
  const flipped_iv: number[] = [];
  for (let i = 0; i < initialVectorBuffer.length; i++) {
    flipped_iv.push(~initialVectorBuffer[i]);
  }

  // encrypt response data
  const cipher = crypto.createCipheriv(
    "aes-128-gcm",
    aesKeyBuffer,
    Buffer.from(flipped_iv)
  );
  return Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
};

export class FlowEndpointException extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}
