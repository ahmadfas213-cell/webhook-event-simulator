const express =
    require("express");

const cors =
    require("cors");

const crypto =
    require("crypto");

require("dotenv").config();


const app =
    express();


const PORT =
    process.env.PORT || 3000;


const DEFAULT_SECRET =
    process.env.DEFAULT_SECRET ||
    "demo_secret_123";


app.use(
    cors()
);


app.use(
    express.json({
        limit: "1mb"
    })
);


const requestHistory = [];


app.get(
    "/",
    function (req, res) {

        res.json({

            service:
                "Webhook Event Simulator",

            status:
                "online",

            version:
                "1.0.0",

            endpoints: [

                "GET /",

                "POST /simulate",

                "POST /verify",

                "GET /history"

            ]

        });

    }
);


app.post(
    "/simulate",
    async function (req, res) {

        const started =
            Date.now();


        const {
            endpoint,
            secret,
            payload
        } = req.body;


        if (!endpoint) {

            return res.status(400).json({

                error:
                    "Webhook endpoint is required."

            });

        }


        if (!payload) {

            return res.status(400).json({

                error:
                    "Payload is required."

            });

        }


        const webhookSecret =
            secret ||
            DEFAULT_SECRET;


        const eventId =
            payload.id ||
            generateEventId();


        const body =
            JSON.stringify(
                payload
            );


        const signature =
            createSignature(
                body,
                webhookSecret
            );


        await delay(
            randomDelay()
        );


        const status =
            simulateStatus(
                payload.type
            );


        const duration =
            Date.now() -
            started;


        const record = {

            eventId,

            type:
                payload.type ||
                "unknown",

            endpoint,

            status,

            latency:
                duration,

            timestamp:
                new Date()
                    .toISOString(),

            signature

        };


        requestHistory.unshift(
            record
        );


        if (
            requestHistory.length > 50
        ) {

            requestHistory.pop();

        }


        res.status(200).json({

            success:
                status >= 200 &&
                status < 300,

            status,

            eventId,

            signature,

            latency:
                duration,

            response:
                createResponse(
                    status,
                    eventId,
                    payload.type
                )

        });

    }
);


app.post(
    "/verify",
    function (req, res) {

        const {
            payload,
            secret,
            signature
        } = req.body;


        if (
            !payload ||
            !secret ||
            !signature
        ) {

            return res.status(400).json({

                valid: false,

                error:
                    "Payload, secret and signature are required."

            });

        }


        const body =
            JSON.stringify(
                payload
            );


        const expected =
            createSignature(
                body,
                secret
            );


        const valid =
            safeCompare(
                expected,
                signature
            );


        res.json({

            valid,

            expected,

            received:
                signature

        });

    }
);


app.get(
    "/history",
    function (req, res) {

        res.json({

            count:
                requestHistory.length,

            requests:
                requestHistory

        });

    }
);


app.get(
    "/health",
    function (req, res) {

        res.json({

            status:
                "healthy",

            uptime:
                process.uptime(),

            timestamp:
                new Date()
                    .toISOString()

        });

    }
);


function createSignature(
    payload,
    secret
) {

    const digest =
        crypto
            .createHmac(
                "sha256",
                secret
            )
            .update(payload)
            .digest("hex");


    return `sha256=${digest}`;

}


function safeCompare(
    first,
    second
) {

    const firstBuffer =
        Buffer.from(
            first
        );

    const secondBuffer =
        Buffer.from(
            second
        );


    if (
        firstBuffer.length !==
        secondBuffer.length
    ) {

        return false;

    }


    return crypto.timingSafeEqual(
        firstBuffer,
        secondBuffer
    );

}


function generateEventId() {

    return (
        "evt_" +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(4)
            .toString("hex")
    );

}


function randomDelay() {

    return (
        80 +
        Math.floor(
            Math.random() * 420
        )
    );

}


function simulateStatus(
    eventType
) {

    const random =
        Math.random();


    if (
        eventType ===
        "payment.failed"
    ) {

        return 422;

    }


    if (
        random < 0.08
    ) {

        return 500;

    }


    if (
        random < 0.15
    ) {

        return 429;

    }


    return 200;

}


function createResponse(
    status,
    eventId,
    type
) {

    if (
        status === 200
    ) {

        return {

            received:
                true,

            event_id:
                eventId,

            event:
                type,

            message:
                "Webhook accepted successfully."

        };

    }


    if (
        status === 422
    ) {

        return {

            received:
                false,

            error:
                "Event rejected by destination."

        };

    }


    if (
        status === 429
    ) {

        return {

            received:
                false,

            error:
                "Rate limit exceeded.",

            retry_after:
                30

        };

    }


    return {

        received:
            false,

        error:
            "Internal server error."

    };

}


function delay(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


app.listen(
    PORT,
    function () {

        console.log(
            `
Webhook Event Simulator
-----------------------
Server: http://localhost:${PORT}
Health: http://localhost:${PORT}/health
Webhook: POST /simulate
Verify: POST /verify
History: GET /history
            `
        );

    }
);