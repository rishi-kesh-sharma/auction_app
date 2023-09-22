import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
// function for sending the email
const sendEmail = async (
  subject,
  send_to,
  sent_from,
  reply_to,
  template,
  name,
  description
) => {
  //creating the email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const handlerOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialDirs: path.resolve("./views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views"),
    extName: ".handlebars",
  };

  transporter.use("compile", hbs(handlerOptions));

  //options for sending the email
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject,
    template,
    context: {
      name,
      description,
    },
  };

  //sending the email
  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
};
export default sendEmail;
