import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { amount, customerName, customerEmail, orderId, description, portalToken, invoiceId } = await request.json();

    const origin = request.headers.get('origin');
    const successUrl = portalToken
      ? `${origin}/payment-success?portal_token=${portalToken}&invoice_id=${invoiceId}&amount=${amount}`
      : `${origin}/payment-success`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Blue Rocket Order',
              description: `Order ${orderId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: `${origin}/payment-cancelled`,
      metadata: {
        order_id: orderId,
        customer_name: customerName,
        invoice_id: invoiceId,
        amount: amount,
      },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
