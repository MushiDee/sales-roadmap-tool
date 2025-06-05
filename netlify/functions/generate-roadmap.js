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

    console.log('Constructing simplified prompt');
    const prompt = `
      You are an expert IT consultant. Create a 1-month IT roadmap with one milestone for the client ${clientName}. For each product, include:
      - A project plan with 1 task (e.g., setup), timeline (Week 1), effort hours (e.g., 5 hours), product, and dependencies (e.g., licensing excluded).
      - A summary table with the task, hours, and product.
      - One deliverable tied to the product's quantity.
      - One best practice guideline (e.g., ITIL 4).
      The milestone must include:
      - Name: "Initial Setup"
      - Timeframe: "Weeks 1-2"
      - 1 deliverable per product
      - Approach in non-technical language
      - 1 risk
      - 1 KPI (e.g., "90% uptime")
      For Managed remote Helpdesk, assume 8/5 service. Provide one next step with a 1-week timeline. Use exact product names.

      Service Context:
      - Managed remote Helpdesk: 8/5 IT support, ticketing software license excluded.
      - Managed Onsite Support technician (in hours): Hourly on-site support, no licensing costs.
      - Managed Servers: Manages servers, hardware/OS licenses excluded.

      Client Information:
      - Name: ${clientName}
      - Challenges: ${itChallenges}
      - Goals: ${businessGoals}
      - Infrastructure: ${currentInfra}
      - Products: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Example Milestone:
      {
        "name": "Initial Setup",
        "timeframe": "Weeks 1-2",
        "deliverables": ["Deploy 10 units of Managed remote Helpdesk (8/5)"],
        "approach": "Set up support to reduce outages.",
        "risks": ["License delay"],
        "kpis": ["90% uptime"],
        "productsUsed": ["Managed remote Helpdesk"],
        "projectPlan": [{"task": "Setup", "timeline": "Week 1", "effortHours": 5, "product": "Managed remote Helpdesk", "dependencies": "License excluded"}],
        "bestPractices": [{"product": "Managed remote Helpdesk", "guideline": "ITIL 4"}],
        "summaryTable": [{"task": "Setup", "hours": 5, "product": "Managed remote Helpdesk"}]
      }

      Return JSON with:
      - milestones: array of milestone objects
      - nextSteps: string
    `;

    console.log('Calling xAI Grok API');
    const startTime = Date.now();
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + (process.env.GROK_API_KEY || ''),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      }),
      timeout: 6000 // 6-second timeout
    }).catch(err => {
      console.error('API fetch error:', err.message, { duration: Date.now() - startTime });
      throw err;
    });

    console.log(`API response status: ${response.status}, duration: ${Date.now() - startTime} ms`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', response.status, errorText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `API request failed: ${errorText}` })
      };
    }

    const apiResponse = await response.json();
    console.log('Raw Grok API response length:', JSON.stringify(apiResponse).length);

    let roadmap;
    try {
      console.log('Parsing API response');
      if (!apiResponse.choices || !apiResponse.choices[0]?.message?.content) {
        throw new Error('No valid content in API response');
      }
      roadmap = JSON.parse(apiResponse.choices[0].message.content);
      console.log('Parsed roadmap objects:', roadmap.milestones?.length || 0);
      if (!roadmap.milestones.every(m => m.projectPlan && Array.isArray(m.projectPlan) && m.projectPlan.length >= products.length && m.summaryTable && Array.isArray(m.summaryTable) && m.summaryTable.length >= products.length)) {
        console.error('Missing projectPlan or summaryTable');
        throw new Error('Missing or incomplete projectPlan or summaryTable');
      }
      console.log('Project plans included:', roadmap.milestones.every(m => m.projectPlan?.length > 0));
      console.log('Summary tables included:', roadmap.milestones.every(m => m.summaryTable?.length > 0));
    } catch (e) {
      console.error('Invalid JSON or incomplete response:', apiResponse.choices?.[0]?.message?.content || '', e.message);
      // Fallback roadmap
      roadmap = {
        milestones: [
          {
            name: "Fallback Milestone",
            timeframe: "Weeks 1-2",
            deliverables: [`Basic setup for ${products.map(p => p.product).join(', ')}`],
            approach: `Initiate setup to address ${itChallenges}.`,
            risks: ['API timeout'],
            kpis: ['Complete setup in 2 weeks'],
            productsUsed: products.map(p => p.product),
            projectPlan: products.map(p => ({
              task: `Setup ${p.product}`,
              timeline: "Week 1",
              effortHours: 5,
              product: p.product,
              dependencies: p.product.includes('Helpdesk') || p.product.includes('Servers') ? 'Licensing/hardware excluded' : 'None'
            })),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: `Follow industry standards for ${p.product}`
            })),
            summaryTable: products.map(p => ({
              task: `Setup ${p.product}`,
              hours: 5,
              product: p.product
            }))
          }
        ],
        nextSteps: `Schedule setup review with ${clientName} within 1 week.`
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