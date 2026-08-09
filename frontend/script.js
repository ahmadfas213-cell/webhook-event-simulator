const API_URL = "http://localhost:3000";

const eventType = document.getElementById("eventType");
const endpoint = document.getElementById("endpoint");
const secret = document.getElementById("secret");
const payload = document.getElementById("payload");

const generateButton = document.getElementById("generateButton");
const sendButton = document.getElementById("sendButton");
const clearButton = document.getElementById("clearButton");

const responseStatus = document.getElementById("responseStatus");
const statusCode = document.getElementById("statusCode");
const latency = document.getElementById("latency");
const eventId = document.getElementById("eventId");
const responseBody = document.getElementById("responseBody");
const signature = document.getElementById("signature");

const historyTable = document.getElementById("historyTable");
const clearHistory = document.getElementById("clearHistory");
const copyResponse = document.getElementById("copyResponse");

const verifyPayload = document.getElementById("verifyPayload");
const verifySecret = document.getElementById("verifySecret");
const verifySignatureInput = document.getElementById("verifySignature");
const verifyButton = document.getElementById("verifyButton");
const verificationResult = document.getElementById("verificationResult");

let webhookHistory = [];

try {
    webhookHistory = JSON.parse(
        localStorage.getItem("webhook_history") || "[]"
    );
} catch {
    webhookHistory = [];
}

function randomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
}

function createEventId() {
    return "evt_" + Date.now().toString(36) + "_" + randomString(6);
}

function generateWebhookPayload() {
    const type = eventType.value;
    const id = createEventId();
    const createdAt = new Date().toISOString();

    let data;

    if (type === "user.created") {
        data = {
            user_id: "usr_" + randomString(8),
            name: "Demo Developer",
            email: "developer@example.com",
            role: "developer"
        };
    } else if (type === "payment.completed") {
        data = {
            payment_id: "pay_" + randomString(8),
            amount: 149900,
            currency: "IDR",
            status: "completed"
        };
    } else if (type === "payment.failed") {
        data = {
            payment_id: "pay_" + randomString(8),
            amount: 249900,
            currency: "IDR",
            status: "failed",
            reason: "insufficient_funds"
        };
    } else if (type === "order.created") {
        data = {
            order_id: "ord_" + randomString(8),
            customer_id: "cus_" + randomString(6),
            total: 349000,
            currency: "IDR"
        };
    } else if (type === "subscription.updated") {
        data = {
            subscription_id: "sub_" + randomString(8),
            plan: "pro",
            status: "active",
            renewal: "monthly"
        };
    } else {
        data = {
            message: "Webhook event"
        };
    }

    const webhook = {
        id: id,
        type: type,
        created_at: createdAt,
        data: data
    };

    payload.value = JSON.stringify(webhook, null, 4);
}

async function sendWebhookRequest() {
    let parsedPayload;

    try {
        parsedPayload = JSON.parse(payload.value);
    } catch {
        responseStatus.textContent = "INVALID JSON";
        responseStatus.style.color = "#ff7777";
        responseBody.textContent = "Payload JSON is invalid.";
        return;
    }

    sendButton.disabled = true;
    sendButton.textContent = "SENDING...";

    const startTime = performance.now();

    try {
        const response = await fetch(`${API_URL}/simulate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                endpoint: endpoint.value,
                secret: secret.value,
                payload: parsedPayload
            })
        });

        const result = await response.json();

        const elapsed = Math.round(
            performance.now() - startTime
        );

        const finalStatus =
            result.status ?? response.status;

        statusCode.textContent = finalStatus;
        latency.textContent = `${elapsed} ms`;

        eventId.textContent =
            result.eventId ||
            parsedPayload.id ||
            "---";

        signature.textContent =
            result.signature ||
            "---";

        responseBody.textContent =
            JSON.stringify(
                result.response ?? result,
                null,
                4
            );

        if (
            response.ok &&
            finalStatus >= 200 &&
            finalStatus < 300
        ) {
            responseStatus.textContent = "DELIVERED";
            responseStatus.style.color = "#8cff8c";
        } else {
            responseStatus.textContent = "FAILED";
            responseStatus.style.color = "#ff7777";
        }

        verifyPayload.value =
            JSON.stringify(
                parsedPayload,
                null,
                4
            );

        verifySecret.value = secret.value;

        verifySignatureInput.value =
            result.signature || "";

        addWebhookHistory({
            id:
                result.eventId ||
                parsedPayload.id ||
                "---",
            event:
                parsedPayload.type ||
                "unknown",
            status: finalStatus,
            latency: elapsed,
            time: new Date().toLocaleTimeString()
        });

    } catch (error) {
        responseStatus.textContent = "CONNECTION ERROR";
        responseStatus.style.color = "#ff7777";

        statusCode.textContent = "ERR";
        latency.textContent = "---";
        eventId.textContent = "---";
        signature.textContent = "---";

        responseBody.textContent =
            "Backend tidak bisa diakses.\n\n" +
            error.message +
            "\n\nPastikan backend berjalan di:\n" +
            "http://localhost:3000";
    }

    sendButton.disabled = false;
    sendButton.textContent = "SEND WEBHOOK";
}

function addWebhookHistory(item) {
    webhookHistory.unshift(item);

    webhookHistory = webhookHistory.slice(0, 30);

    localStorage.setItem(
        "webhook_history",
        JSON.stringify(webhookHistory)
    );

    renderWebhookHistory();
}

function renderWebhookHistory() {
    historyTable.innerHTML = "";

    if (webhookHistory.length === 0) {
        historyTable.innerHTML = `
            <tr>
                <td colspan="5">
                    No webhook deliveries yet.
                </td>
            </tr>
        `;
        return;
    }

    webhookHistory.forEach(function(item) {
        const row = document.createElement("tr");

        const success =
            item.status >= 200 &&
            item.status < 300;

        const statusClass =
            success
                ? "status-success"
                : "status-failed";

        row.innerHTML = `
            <td>${escapeHTML(item.id)}</td>
            <td>${escapeHTML(item.event)}</td>
            <td class="${statusClass}">
                ${item.status}
            </td>
            <td>${item.latency} ms</td>
            <td>${escapeHTML(item.time)}</td>
        `;

        historyTable.appendChild(row);
    });
}

async function executeHmacVerification() {
    const rawPayload =
        verifyPayload.value.trim();

    const secretValue =
        verifySecret.value.trim();

    const providedSignature =
        verifySignatureInput.value.trim();

    if (
        !rawPayload ||
        !secretValue ||
        !providedSignature
    ) {
        verificationResult.textContent =
            "MISSING DATA";

        verificationResult.className =
            "verify-failed";

        return;
    }

    let parsedPayload;

    try {
        parsedPayload =
            JSON.parse(rawPayload);
    } catch {
        verificationResult.textContent =
            "INVALID JSON";

        verificationResult.className =
            "verify-failed";

        return;
    }

    verificationResult.textContent =
        "VERIFYING...";

    verificationResult.className = "";

    try {
        const response =
            await fetch(`${API_URL}/verify`, {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    payload: parsedPayload,
                    secret: secretValue,
                    signature: providedSignature
                })
            });

        const result =
            await response.json();

        if (result.valid === true) {
            verificationResult.textContent =
                "✓ SIGNATURE VALID";

            verificationResult.className =
                "verify-success";
        } else {
            verificationResult.textContent =
                "✕ SIGNATURE INVALID";

            verificationResult.className =
                "verify-failed";
        }

    } catch {
        verificationResult.textContent =
            "BACKEND ERROR";

        verificationResult.className =
            "verify-failed";
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function copyResponseBody() {
    try {
        await navigator.clipboard.writeText(
            responseBody.textContent
        );

        copyResponse.textContent = "COPIED";

        setTimeout(function() {
            copyResponse.textContent = "COPY";
        }, 1000);

    } catch {
        copyResponse.textContent = "FAILED";
    }
}

function clearWebhookForm() {
    payload.value = "";

    responseStatus.textContent = "READY";
    responseStatus.style.color = "#555";

    statusCode.textContent = "---";
    latency.textContent = "---";
    eventId.textContent = "---";
    signature.textContent = "---";

    responseBody.textContent =
        "Waiting for webhook delivery...";
}

function clearWebhookHistory() {
    webhookHistory = [];

    localStorage.removeItem(
        "webhook_history"
    );

    renderWebhookHistory();
}

generateButton.addEventListener(
    "click",
    generateWebhookPayload
);

eventType.addEventListener(
    "change",
    generateWebhookPayload
);

sendButton.addEventListener(
    "click",
    sendWebhookRequest
);

clearButton.addEventListener(
    "click",
    clearWebhookForm
);

clearHistory.addEventListener(
    "click",
    clearWebhookHistory
);

copyResponse.addEventListener(
    "click",
    copyResponseBody
);

verifyButton.addEventListener(
    "click",
    executeHmacVerification
);

generateWebhookPayload();
renderWebhookHistory();