  // Subscription Management Routes
  
  // Get available subscription plans
  apiRouter.get("/subscription/plans", async (req: Request, res: Response) => {
    try {
      const plans = {
        free: {
          id: "free",
          name: "Free Tier",
          ...tierLimits.free
        },
        pro: {
          id: "pro",
          name: "Pro Tier",
          ...tierLimits.pro
        },
        enterprise: {
          id: "enterprise",
          name: "Enterprise Tier",
          ...tierLimits.enterprise
        }
      };
      
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });
  
  // Create a subscription setup intent
  apiRouter.post("/subscription/create-setup-intent", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "User must be authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create or retrieve a Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        stripeCustomerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId,
          stripeSubscriptionId: ""
        });
      }
      
      // Create a SetupIntent to collect payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
      });
      
      res.json({
        clientSecret: setupIntent.client_secret,
        customerId: stripeCustomerId
      });
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Failed to create setup intent" });
    }
  });
  
  // Create a subscription
  apiRouter.post("/subscription/create", async (req: Request, res: Response) => {
    try {
      const { paymentMethodId, planId } = req.body;
      
      if (!req.session.userId) {
        return res.status(401).json({ error: "User must be authenticated" });
      }
      
      if (!paymentMethodId || !planId) {
        return res.status(400).json({ error: "Missing payment method ID or plan ID" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: "User has no Stripe customer ID" });
      }
      
      // Define price IDs based on plan
      let priceId = '';
      let subscriptionTier = user.subscriptionTier;
      
      if (planId === 'pro') {
        priceId = process.env.STRIPE_PRO_PRICE_ID || 'price_pro';
        subscriptionTier = SubscriptionTier.PRO;
      } else if (planId === 'enterprise') {
        priceId = process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise';
        subscriptionTier = SubscriptionTier.ENTERPRISE;
      } else {
        return res.status(400).json({ error: "Invalid plan ID" });
      }
      
      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });
      
      // Set the payment method as the default
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent'],
      });
      
      // Update user subscription in our database
      await storage.updateUserStripeInfo(user.id, {
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: subscription.id
      });
      
      // Update user's subscription tier
      await storage.updateUserSubscription(user.id, subscriptionTier);
      
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        tier: subscriptionTier
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });
  
  // Get current user's subscription
  apiRouter.get("/subscription/current", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "User must be authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.stripeSubscriptionId) {
        return res.json({
          tier: user.subscriptionTier,
          status: "none",
          limits: tierLimits[user.subscriptionTier]
        });
      }
      
      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        tier: user.subscriptionTier,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        limits: tierLimits[user.subscriptionTier]
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });
  
  // Cancel subscription
  apiRouter.post("/subscription/cancel", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "User must be authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "User has no active subscription" });
      }
      
      // Cancel the subscription at period end
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      res.json({
        status: subscription.status,
        cancelAt: new Date(subscription.cancel_at * 1000)
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });
  
  // Stripe webhook handler
  apiRouter.post("/subscription/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    if (!signature) {
      return res.status(400).send('Missing Stripe signature');
    }
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      // Handle the event
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          const customer = subscription.customer as string;
          const user = await storage.getUserByStripeCustomerId(customer);
          
          if (user) {
            if (subscription.status === 'active') {
              // Update user subscription tier based on the product
              const item = subscription.items.data[0];
              const productId = (item.price as Stripe.Price).product as string;
              
              // You would need to map the Stripe product ID to your subscription tiers
              // This is just a placeholder logic
              let newTier = user.subscriptionTier;
              
              if (productId.includes('pro')) {
                newTier = SubscriptionTier.PRO;
              } else if (productId.includes('enterprise')) {
                newTier = SubscriptionTier.ENTERPRISE;
              }
              
              await storage.updateUserSubscription(user.id, newTier);
            } else if (subscription.status === 'canceled') {
              // Downgrade to free tier
              await storage.updateUserSubscription(user.id, SubscriptionTier.FREE);
            }
          }
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });