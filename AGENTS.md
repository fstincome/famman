## Notification emails
- Build notification MIME with Nodemailer and the function-local message factory, never manual encoders or pre-encoded headers, to preserve Unicode and literal equals signs across mail clients.
- Keep Gmail SMTP credentials in managed secrets ; notifications go to every profile of the actor's family (deduplicated by email).