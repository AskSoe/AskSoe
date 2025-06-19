  apiRouter.post("/ask", async (req: Request, res: Response) => {
    if (!req.body.prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    
    try {
      // Get systems to provide context
      const systems = await storage.getSystems();
      const connectedSystems = systems.filter(s => s.status === "connected" || s.status === "limited");
      
      // Create a new conversation for this request (if we don't already have one)
      let conversationId = req.body.conversationId;
      
      if (!conversationId) {
        // Generate title from the first ~50 chars of message
        const title = req.body.prompt.length > 50 
          ? req.body.prompt.substring(0, 47) + '...' 
          : req.body.prompt;
          
        const newConversation = await storage.createConversation({
          title,
          userId: req.user?.id || null
        });
        
        conversationId = newConversation.id;
      }
      
      console.log(`Ask endpoint: Using conversation ID ${conversationId}`);
      
      // Save the user message
      const userMessage = await storage.createMessage({
        conversationId,
        content: req.body.prompt,
        role: "user",
        systemSources: [],
        visualizations: []
      });
      
      console.log(`Ask endpoint: Created user message with ID ${userMessage.id}`);
      
      // Call OpenAI directly using our adapter
      try {
        // Check if OpenAI is available
        const openAIAvailable = await isOpenAIAvailable();
        
        if (!openAIAvailable) {
          return res.status(500).json({ 
            error: "OpenAI API is not available. Please check your API key configuration."
          });
        }
        
        // Create a temporary processing message that will be updated with the real response
        const processingMessage = await storage.createMessage({
          conversationId,
          content: "Processing...",
          role: "assistant",
          systemSources: [],
          visualizations: []
        });
        
        console.log(`Ask endpoint: Created processing message with ID ${processingMessage.id}`);
        
        // Build context from connected systems
        const systemContext = connectedSystems.length > 0
          ? `You have access to the following enterprise systems: ${connectedSystems.map(s => s.name).join(", ")}. 
             Provide information based on these systems when relevant.`
          : "You are a helpful enterprise assistant.";
        
        // Build messages for OpenAI API call
        const messages: ChatMessage[] = [
          { role: "system", content: systemContext },
          { role: "user", content: req.body.prompt }
        ];
        
        // Get previous messages from the same conversation for context
        if (conversationId) {
          const previousMessages = await storage.getMessages(conversationId);
          // Filter out the processing message and current user message
          const historyMessages = previousMessages
            .filter(m => m.id !== processingMessage.id && m.id !== userMessage.id)
            // Limit to the 10 most recent messages for context
            .slice(-10)
            .map(m => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content
            }));
          
          // Insert history messages before the current user message
          if (historyMessages.length > 0) {
            messages.splice(1, 0, ...historyMessages);
          }
        }
        
        // Get direct response from OpenAI
        console.log(`Ask endpoint: Sending request to OpenAI with ${messages.length} messages`);
        const response = await getChatResponse(messages);
        
        console.log(`Ask endpoint: Received response from OpenAI`);
        
        // Update the message with the final response
        const updatedMessage = await storage.updateMessage(processingMessage.id, {
          content: response.content,
          systemSources: connectedSystems.map(s => s.name)
        });
        
        console.log(`Ask endpoint: Updated processing message with final content`);
        
        // Broadcast the message update to WebSocket clients
        try {
          if ((global as any).expressApp && (global as any).expressApp.broadcastWebSocketMessage) {
            (global as any).expressApp.broadcastWebSocketMessage("message_updated", {
              messageId: processingMessage.id,
              conversationId,
              content: response.content,
              systemSources: connectedSystems.map(s => s.name),
              timestamp: new Date().toISOString()
            });
            console.log(`Ask endpoint: Broadcasted message update via WebSocket`);
          } else {
            console.log(`Ask endpoint: WebSocket broadcast not available`);
          }
        } catch (wsError) {
          console.error("Error broadcasting message update:", wsError);
        }
        
        // Return the complete conversation data
        return res.json({
          conversationId,
          messageId: processingMessage.id,
          content: response.content,
          systemSources: connectedSystems.map(s => s.name)
        });
      } catch (error: any) {
        console.error("Error processing message with OpenAI:", error);
        
        return res.status(500).json({
          error: `Error processing with OpenAI: ${error.message}`,
          conversationId
        });
      }
    } catch (error: any) {
      console.error("General error in /api/ask endpoint:", error);
      return res.status(500).json({ error: `Error processing request: ${error.message}` });
    }
  });