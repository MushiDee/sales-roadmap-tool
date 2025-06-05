const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const corsOrigin = 'https://mushidee.github.io';
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };

  console.log('Function invoked:', { method: event.httpMethod, path: event.path, bodyLength: event.body ? event.body.length : 0 });

  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS preflight');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    console.log('Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('Parsing request body');
    const data = JSON.parse(event.body || '{}');
    const { clientName, itChallenges, businessGoals, currentInfra, products } = data;

    if (!clientName || !itChallenges || !businessGoals || !currentInfra || !products || !Array.isArray(products)) {
      console.log('Invalid input data:', data);
      throw new Error('Invalid input data');
    }

    console.log('Constructing minimal prompt');
    const prompt = `
      Create a 1-month IT roadmap for ${clientName} with one milestone. For each product, include:
      - A project plan with 1 task (e.g., setup), timeline (Week 1), effort hours (5 hours), product, and dependencies.
      - A summary table with the task, hours, and product.
      - One deliverable tied to the product's quantity.
      The milestone must include:
      - Name: "Initial Setup"
      - Timeframe: "Week 1"
      - 1 deliverable per product
      - Approach: "Begin setup to address ${itChallenges}."
      - 1 risk: "Setup delays"
      - 1 KPI: "Complete setup in 1 week"
      For Managed remote Helpdesk, assume 8/5 service. Provide one next step: "Review setup with ${clientName} in 1 week." Use exact product names.

      Products: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Example Milestone:
      {
        "name": "Initial Setup",
        "timeframe": "Week 1",
        "deliverables": ["Deploy 10 units of Managed remote Helpdesk"],
        "approach": "Begin setup to address outages.",
        "risks": ["Setup delays"],
        "kpis": ["Complete setup in 1 week"],
        "productsUsed": ["Managed remote Helpdesk"],
        "projectPlan": [{"task": "Setup", "timeline": "Week 1", "effortHours": 5, "product": "Managed remote Helpdesk", "dependencies": "License excluded"}],
        "summaryTable": [{"task": "Setup", "hours": 5, "product": "Managed remote Helpdesk"}]
      }

      Return JSON with:
      - milestones: array of milestone objects
      - nextSteps: string
    `;

    console.log('Calling xAI Grok API');
    const startTime = Date.now();
    let apiResponse;
    try {
      apiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + (process.env.GROK_API_KEY || ''),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7
        }),
        timeout: 5000 // 5-second timeout
      });
    } catch (err) {
      console.error('API fetch error:', err.message, { duration: Date.now() - startTime });
      // Immediate fallback on timeout
      console.log('Using fallback roadmap due to API timeout');
      const fallbackRoadmap = {
        milestones: [
          {
            name: "Initial Setup",
            timeframe: "Week 1",
            deliverables: products.map(p => `Deploy ${p.quantity} units of ${p.product}`),
            approach: `Begin setup to address ${itChallenges}.`,
            risks: ['Setup delays'],
            kpis: ['Complete setup in 1 week'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.map(p => ({
              task: `Setup ${p.product}`,
              timeline: "Week 1",
              effortHours: 5,
              product: p.product,
              dependencies: p.product.includes('Helpdesk') || p.product.includes('Servers') ? 'Licensing/hardware excluded' : 'None'
            })),
            summaryTable: products.map(p => ({
              task: `Setup ${p.product}`,
              hours: 5,
              product: p.product
            }))
          }
        ],
        nextSteps: `Review setup with ${clientName} in 1 week.`
      };
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ roadmap: fallbackRoadmap })
      };
    }

    console.log(`API response status: ${apiResponse.status}, duration: ${Date.now() - startTime} ms`);
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API request failed:', apiResponse.status, errorText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `API request failed: ${errorText}` })
      };
    }

    const apiResponseData = await apiResponse.json();
    console.log('Raw Grok API response length:', JSON.stringify(apiResponseData).length);

    let roadmap;
    try {
      console.log('Parsing API response');
      if (!apiResponseData.choices || !apiResponseData.choices[0]?.message?.content) {
        throw new Error('No valid content in API response');
      }
      roadmap = JSON.parse(apiResponseData.choices[0].message.content);
      console.log('Parsed roadmap objects:', roadmap.milestones?.length || 0);
      if (!roadmap.milestones.every(m => m.projectPlan && Array.isArray(m.projectPlan) && m.projectPlan.length >= products.length && m.summaryTable && Array.isArray(m.summaryTable) && m.summaryTable.length >= products.length)) {
        console.error('Missing projectPlan or summaryTable');
        throw new Error('Missing or incomplete projectPlan or summaryTable');
      }
      console.log('Project plans included:', roadmap.milestones.every(m => m.projectPlan?.length > 0));
      console.log('Summary tables included:', roadmap.milestones.every(m => m.summaryTable?.length > 0));
    } catch (e) {
      console.error('Invalid JSON or incomplete response:', apiResponseData.choices?.[0]?.message?.content || '', e.message);
      // Fallback roadmap
      roadmap = {
        milestones: [
          {
            name: "Initial Setup",
            timeframe: "Week 1",
            deliverables: products.map(p => `Deploy ${p.quantity} units of ${p.product}`),
            approach: `Begin setup to address ${itChallenges}.`,
            risks: ['Setup delays'],
            kpis: ['Complete setup in 1 week'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.map(p => ({
              task: `Setup ${p.product}`,
              timeline: "Week 1",
              effortHours: 5,
              product: p.product,
              dependencies: p.product.includes('Helpdesk') || p.product.includes('Servers') ? 'Licensing/hardware excluded' : 'None'
            })),
            summaryTable: products.map(p => ({
              task: `Setup ${p.product}`,
              hours: 5,
              product: p.product
            }))
          }
        ],
        nextSteps: `Review setup with ${clientName} in 1 week.`
      };
    }

    console.log('Validating roadmap structure');
    if (!roadmap.milestones || !Array.isArray(roadmap.milestones) || !roadmap.nextSteps) {
      console.error('Invalid roadmap structure:', roadmap);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid roadmap structure' })
      };
    }

    console.log('Returning successful response');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ roadmap })
    };
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Failed to generate roadmap: ${error.message}` })
    };
  }
};