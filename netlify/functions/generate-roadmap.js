const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://MushiDee.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': 'https://MushiDee.github.io' },
      body: 'Method Not Allowed'
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { clientName, itChallenges, businessGoals, currentInfra, products } = data;

    // Construct enhanced prompt with product-specific response points
    const prompt = `
      You are an expert IT consultant for a managed services provider specializing in IT support and Microsoft Cloud services. Based on the provided client information, create a 12-month IT roadmap with three milestones, each tailored to the client's needs, infrastructure, and selected products. For each selected product, include specific response points detailing:
      - How the product addresses the client's IT challenges (e.g., "Managed remote Helpdesk reduces outage response time").
      - Its contribution to achieving the client's business goals (e.g., "Managed Cybersecurity enhances data security for efficiency").
      - A deliverable tied to the product's quantity (e.g., "Deploy 5 Managed Servers for redundancy").
      Distribute these response points across the milestones to ensure all products are addressed. Each milestone must:
      - Include a unique name and timeframe (e.g., Months 1-4).
      - List 3-5 deliverables, each explicitly referencing at least one product and its quantity.
      - Describe the approach in clear, non-technical language, linking product response points to the client's challenges and goals.
      - Identify 2-3 risks specific to the client's infrastructure or product deployment.
      - Provide 3-5 measurable KPIs, tailored to the client's scale (e.g., number of servers) and product-specific outcomes (e.g., "95% ticket resolution within 1 hour using Managed remote Helpdesk").
      Provide next steps that are actionable, specific to the client’s context, include a timeline (e.g., within 2 weeks), and reference actions for each product (e.g., "Train staff on Managed M365 instance"). Use the exact product names provided to avoid misspellings. The roadmap should be professional, client-centric, and free of technical jargon for non-technical stakeholders.

      Client Information:
      - Client Name: ${clientName}
      - IT Challenges: ${itChallenges}
      - Business Goals (Next 12 Months): ${businessGoals}
      - Current Infrastructure: ${currentInfra}
      - Products and Quantities: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Return the response in JSON format with:
      - milestones: array of milestone objects (name, timeframe, deliverables, approach, risks, kpis, productsUsed: array of product names referenced in this milestone)
      - nextSteps: string describing actionable next steps with timelines
    `;

    // Call xAI Grok API
    const response = await fetch('https://api.x.ai/v1/grok', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        max_tokens: 2500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API request failed: ${response.statusText}`);
    }

    const apiResponse = await response.json();
    console.log('Raw Grok API response:', apiResponse);

    let roadmap;
    try {
      roadmap = JSON.parse(apiResponse.text);
    } catch (e) {
      console.error('Invalid JSON response:', apiResponse.text);
      // Fallback roadmap
      roadmap = {
        milestones: [
          {
            name: 'Fallback Milestone',
            timeframe: 'Months 1-12',
            deliverables: [`Basic IT assessment using ${products.map(p => p.product).join(', ')}`],
            approach: `Conduct a review of ${clientName}'s infrastructure to address ${itChallenges} using ${products.map(p => p.product).join(', ')}.`,
            risks: ['Potential delays', 'Resource constraints'],
            kpis: ['Complete assessment within 1 month', 'Deploy products within 6 months'],
            productsUsed: products.map(p => p.product)
          }
        ],
        nextSteps: `Schedule a meeting with ${clientName} to discuss initial assessment within 2 weeks.`
      };
    }

    // Validate roadmap structure
    if (!roadmap.milestones || !Array.isArray(roadmap.milestones) || !roadmap.nextSteps) {
      throw new Error('Invalid roadmap structure from API');
    }

    // Ensure productsUsed is included
    roadmap.milestones = roadmap.milestones.map(milestone => ({
      ...milestone,
      productsUsed: milestone.productsUsed || products.map(p => p.product)
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': 'https://MushiDee.github.io' },
      body: JSON.stringify({ roadmap })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'https://MushiDee.github.io' },
      body: JSON.stringify({ error: 'Failed to generate roadmap' })
    };
  }
};