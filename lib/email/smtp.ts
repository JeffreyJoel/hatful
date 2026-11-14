// Nodemailer waits minutes by default; a stalled server must fail the send while the
// person is still looking at the form.
export const smtpTimeouts = { connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000 };
