import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { amount, customerName, customerEmail, orderId, description } = await request.json();

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
      success_url: `${request.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/payment-cancelled`,
      metadata: {
        order_id: orderId,
        customer_name: customerName,
      },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
