"use client";
export default function Home() {
  const sendMessage = async () => {
    // Placeholder for sending message logic
    console.log("Send message clicked");

    try {
      // Get registration options
      const optionsResponse = await fetch("/api/whatsapp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        from: "14084429812",
                        text: { body: "start" },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to process");
      }
    } catch (error) {
      console.error(" error:", error);
    } finally {
    }
  };
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <button onClick={sendMessage}>Send message</button>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        WhatsPorter copyright OlaNCo
      </footer>
    </div>
  );
}
