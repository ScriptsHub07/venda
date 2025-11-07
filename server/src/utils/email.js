const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendAdminOrderEmail({ adminEmail, order }) {
  const subject = `Novo pedido #${order._id} — ${order.user?.name || 'Cliente'}`;
  const html = `
    <p>Novo pedido recebido:</p>
    <ul>
      <li><strong>Nome:</strong> ${order.user?.name || ''}</li>
      <li><strong>E-mail:</strong> ${order.user?.email || ''}</li>
      <li><strong>Endereço:</strong> ${order.address?.street || ''}, ${order.address?.city || ''} — ${order.address?.postalCode || ''}</li>
    </ul>
    <p>Itens:</p>
    <ul>
      ${order.items.map(i => `<li>${i.title} — ${i.quantity} x ${(i.priceCents/100).toFixed(2)} R$</li>`).join('')}
    </ul>
    <p>Total: ${(order.totalCents/100).toFixed(2)} R$</p>
  `;

  return transporter.sendMail({
    from: process.env.SMTP_USER,
    to: adminEmail || process.env.ADMIN_EMAIL,
    subject,
    html
  });
}

module.exports = { sendAdminOrderEmail };
