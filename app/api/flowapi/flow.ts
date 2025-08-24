// type DecryptedBody = {
//   screen: string;
//   data: Record<string, any>;
//   version: string;
//   action: string;
//   flow_token: string;
// };

// type ResponseData = {
//   screen?: string;
//   data: Record<string, any>;
// };

// export const getNextScreen = async (
//   decryptedBody: DecryptedBody
// ): Promise<ResponseData> => {
//   const { screen, data, version, action, flow_token } = decryptedBody;

//   // handle health check request
//   if (action === "ping") {
//     return {
//       data: {
//         status: "active",
//       },
//     };
//   }

//   // handle error notification
//   if (data?.error) {
//     console.warn("Received client error:", data);
//     return {
//       data: {
//         acknowledged: true,
//       },
//     };
//   }

//   // handle initial request when opening the flow
//   if (action === "INIT") {
//     return {
//       screen: "MY_SCREEN",
//       data: {
//         // custom data for the screen
//         greeting: "Hey there! 👋",
//       },
//     };
//   }

//   if (action === "data_exchange") {
//     // handle the request based on the current screen
//     switch (screen) {
//       case "MY_SCREEN":
//         // TODO: process flow input data
//         console.info("Input name:", data?.name);

//         // send success response to complete and close the flow
//         return {
//           screen: "SUCCESS",
//           data: {
//             extension_message_response: {
//               params: {
//                 flow_token,
//               },
//             },
//           },
//         };
//       default:
//         break;
//     }
//   }

//   console.error("Unhandled request body:", decryptedBody);
//   throw new Error(
//     "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
//   );
// };

import { createCipheriv, randomBytes, CipherGCMTypes } from "crypto";
import { FlowResponse } from "./crypthelper";

// type ResponseData = Record<string, any>;

interface DecryptedBody {
  screen?: string;
  data?: {
    error?: unknown;
    name?: string;
    [key: string]: unknown;
  };
  version?: string;
  action?: string;
  flow_token?: string;
}

export const getNextScreen = async (
  decryptedBody: DecryptedBody
): Promise<FlowResponse> => {
  const { screen, data, version, action, flow_token } = decryptedBody;

  // handle health check request
  if (action === "ping") {
    return {
      data: {
        status: "active",
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      data: {
        acknowledged: true,
      },
    };
  }

  // handle initial request when opening the flow
  if (action === "INIT") {
    return {
      screen: "MY_SCREEN",
      data: {
        // custom data for the screen
        greeting: "Hey there! 👋",
      },
    };
  }

  if (action === "data_exchange") {
    // handle the request based on the current screen
    switch (screen) {
      case "MY_SCREEN":
        // TODO: process flow input data
        console.info("Input name:", data?.name);

        // send success response to complete and close the flow
        return {
          screen: "SUCCESS",
          data: {
            extension_message_response: {
              params: {
                flow_token,
              },
            },
          },
        };
      default:
        break;
    }
  }

  console.error("Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
};

// export const encryptResponse = (
//   response: ResponseData,
//   aesKeyBuffer: Buffer,
//   initialVectorBuffer: Buffer
// ): string => {
//   // flip initial vector
//   const flippedIv: number[] = [];
//   for (const pair of initialVectorBuffer.entries()) {
//     flippedIv.push(~pair[1]);
//   }

//   // Encrypt response data
//   const cipher = createCipheriv(
//     "aes-128-gcm" as CipherGCMTypes, // Type assertion to handle GCM mode
//     aesKeyBuffer,
//     Buffer.from(flippedIv)
//   );

//   // Concatenate the encrypted data, auth tag, and return the base64 string
//   const encryptedData = Buffer.concat([
//     cipher.update(JSON.stringify(response), "utf-8"),
//     cipher.final(),
//     cipher.getAuthTag(),
//   ]);

//   return encryptedData.toString("base64");
// };
