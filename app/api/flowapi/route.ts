import { NextRequest, NextResponse } from "next/server";
import {
  decryptRequest,
  encryptResponse,
  FlowEndpointException,
} from "./crypthelper";

import { getNextScreen } from "./flow";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body as JSON
    const body = await req.json();
    console.log("📨 Raw request body:", body);

    // Validate required fields
    if (
      !body.encrypted_aes_key ||
      !body.encrypted_flow_data ||
      !body.initial_vector
    ) {
      return NextResponse.json(
        { error: "Missing required encrypted data fields" },
        { status: 400 }
      );
    }

    let decryptedRequest;
    try {
      //   // You'll need to provide your private key and passphrase
      //   const privatePem = process.env.WHATSAPP_PRIVATE_KEY;
      //   const passphrase = process.env.WHATSAPP_PASSPHRASE;

      //   if (!privatePem) {
      //     return NextResponse.json(
      //       { error: "Server configuration error" },
      //       { status: 500 }
      //     );
      //   }

      decryptedRequest = decryptRequest(body);
    } catch (err) {
      console.error("Decryption failed:", err);

      if (err instanceof FlowEndpointException) {
        return NextResponse.json(
          { error: "Failed to decrypt payload" },
          { status: err.statusCode }
        );
      }

      return NextResponse.json(
        { error: "Failed to decrypt payload" },
        { status: 500 }
      );
    }

    const { aesKeyBuffer, initialVectorBuffer, decryptedBody } =
      decryptedRequest;
    console.log("💬 Decrypted Request:", decryptedBody);

    // Process the decrypted request and get response
    const screenResponse = await getNextScreen(decryptedBody);
    console.log("👉 Response to Encrypt:", screenResponse);

    // Encrypt and return the response
    const encryptedResponse = encryptResponse(
      screenResponse,
      aesKeyBuffer,
      initialVectorBuffer
    );

    return new NextResponse(encryptedResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (err) {
    console.error("Request processing error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
