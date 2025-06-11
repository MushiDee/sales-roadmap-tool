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

    console.log('Constructing detailed prompt');
    const prompt = `
      You are an expert IT consultant for JEC Technologies (Pty) Ltd, specializing in managed IT services and Microsoft Cloud solutions. Create a 12-month IT roadmap with three milestones tailored to the client's specific needs, infrastructure, and selected products, addressing their unique challenges and goals. For each product in each milestone, include:
      - A project plan with 3 tasks per product, each tailored to the client's IT challenges (e.g., server dependency, connectivity issues) and aligned with industry best practices for deployment (e.g., ITIL 4 for Managed remote Helpdesk, NIST for Managed Cybersecurity & SOC service, Microsoft Zero Trust for Managed M365 instance). Tasks must include:
        - A specific action (e.g., "Implement daily backups" for Managed Servers, "Configure intrusion detection" for Managed Firewalls).
        - A timeline (e.g., Weeks 1-2).
        - Effort hours (e.g., 10-20 hours) based on product complexity and client scale.
        - Product name and dependencies (e.g., licensing/hardware excluded).
      - Response points detailing how each task addresses the client's challenges and contributes to their goals.
      - One industry best practice guideline per product (e.g., ITIL 4, NIST, Microsoft Zero Trust).
      Each milestone must include:
      - A unique name and timeframe (e.g., Months 1-4).
      - 2-3 deliverables tied to product quantities and client needs (e.g., "Deploy 15 units of Managed remote Helpdesk with 8/5 support").
      - An approach in clear, non-technical language, linking tasks to client challenges and goals.
      - 2 risks specific to the client's infrastructure or product deployment.
      - 3 measurable KPIs tailored to the client's scale and outcomes (e.g., "95% ticket resolution within 1 hour").
      For Managed remote Helpdesk, specify 8/5 or 24/7 service based on client needs (e.g., 24/7 for critical systems). Provide 2-3 next steps with timelines (e.g., within 2 weeks) and product-specific actions. Use exact product names and ensure the roadmap is professional, client-centric, and jargon-free.

      Service Context (abridged):
      - Managed Vendors: Coordinates vendors, no licensing costs.
      - Managed remote Helpdesk: 8/5 support (24/7 optional), ticketing license excluded.
      - Managed Onsite Support technician (in hours): Hourly on-site support, no licensing.
      - Managed M365 instance: Manages M365 tenants, licenses excluded.
      - Managed Local Area network service: Monitors LAN, hardware/licenses excluded.
      - Managed Servers: Manages servers, hardware/OS licenses excluded.
      - Managed Firewalls: Configures firewalls, hardware/licenses excluded.
      - Managed Azure IaaS service: Deploys Azure infrastructure, subscription costs excluded.
      - Managed Cybersecurity & SOC service: 24/7 monitoring, security tool licenses excluded.

      Client Information:
      - Name: ${clientName}
      - Challenges: ${itChallenges}
      - Goals: ${businessGoals}
      - Infrastructure: ${currentInfra}
      - Products: ${products.map(p => `${p.product} (${p.quantity} units)`).join(', ')}

      Example Milestone Structure:
      {
        "name": "Infrastructure Stabilization",
        "timeframe": "Months 1-4",
        "deliverables": ["Deploy 1 unit of Managed Servers with daily backups", "Configure 1 unit of Managed Firewalls for security"],
        "approach": "Stabilize the on-premises server with backups and enhance security to address data loss risks and support remote access needs.",
        "risks": ["Backup configuration delays", "Firewall integration issues"],
        "kpis": ["99.9% server uptime", "100% backup completion daily", "Zero security breaches"],
        "productsUsed": ["Managed Servers", "Managed Firewalls"],
        "projectPlan": [
          {"task": "Implement daily backups for 4TB server", "timeline": "Weeks 1-2", "effortHours": 15, "product": "Managed Servers", "dependencies": "Hardware excluded"},
          {"task": "Configure intrusion detection system", "timeline": "Weeks 3-4", "effortHours": 20, "product": "Managed Firewalls", "dependencies": "Licensing excluded"},
          {"task": "Train staff on backup procedures", "timeline": "Weeks 5-6", "effortHours": 10, "product": "Managed Servers", "dependencies": "None"}
        ],
        "bestPractices": [
          {"product": "Managed Servers", "guideline": "Follow ITIL 4 for backup management"},
          {"product": "Managed Firewalls", "guideline": "Adhere to NIST cybersecurity framework"}
        ]
      }

      Return JSON with:
      - milestones: array of milestone objects (name, timeframe, deliverables, approach, risks, kpis, productsUsed, projectPlan, bestPractices)
      - nextSteps: string

      Ensure projectPlan includes 3 specific tasks per product per milestone, aligned with best practices and client needs, and do not include a summaryTable.
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
          max_tokens: 1200,
          temperature: 0.7
        }),
        timeout: 7000 // 7-second timeout
      });
    } catch (err) {
      console.error('API fetch error:', err.message, { duration: Date.now() - startTime });
      console.log('Using fallback roadmap due to API timeout');
      const fallbackRoadmap = {
        milestones: [
          {
            name: "Infrastructure Foundation",
            timeframe: "Months 1-4",
            deliverables: ["Deploy 1 unit of Managed Servers with daily backups", "Configure 1 unit of Managed Firewalls"],
            approach: "Establish a stable foundation by addressing server dependency and security concerns with tailored backups and firewall setup.",
            risks: ["Backup setup delays", "Firewall compatibility issues"],
            kpis: ["99.9% server uptime", "100% daily backup success", "Zero unauthorized access"],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Assess ${p.product} for ${clientName}'s ${currentInfra.includes('server') ? 'server' : 'network'} needs`, timeline: "Weeks 1-2", effortHours: 10, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Configure ${p.product} per best practices`, timeline: "Weeks 3-4", effortHours: 15, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Train staff on ${p.product} usage`, timeline: "Weeks 5-6", effortHours: 10, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'Follow ITIL 4 for incident management' :
                         p.product.includes('M365') ? 'Implement Microsoft Zero Trust' :
                         p.product.includes('Cybersecurity') ? 'Adhere to NIST guidelines' :
                         `Ensure standard deployment for ${p.product}`
            }))
          },
          {
            name: "Optimization and Expansion",
            timeframe: "Months 5-8",
            deliverables: ["Optimize 15 units of Managed remote Helpdesk", "Enhance 10 units of Managed Local Area network service"],
            approach: "Optimize existing systems and expand capabilities to improve performance and support growing needs.",
            risks: ["User adoption delays", "Network configuration errors"],
            kpis: ["95% system uptime", "80% user adoption rate", "20% performance improvement"],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Monitor ${p.product} performance`, timeline: "Weeks 1-2", effortHours: 8, product: p.product, dependencies: 'None' },
              { task: `Tune ${p.product} settings`, timeline: "Weeks 3-4", effortHours: 12, product: p.product, dependencies: 'None' },
              { task: `Validate ${p.product} enhancements`, timeline: "Weeks 5-6", effortHours: 8, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'ITIL 4 service optimization' :
                         p.product.includes('M365') ? 'Microsoft best practices for collaboration' :
                         p.product.includes('Cybersecurity') ? 'NIST continuous monitoring' :
                         `Optimize ${p.product} performance`
            }))
          },
          {
            name: "Full Integration and Migration",
            timeframe: "Months 9-12",
            deliverables: ["Integrate 1 unit of Managed Azure IaaS service", "Migrate 4TB data to cloud"],
            approach: "Complete integration and initiate cloud migration to achieve long-term scalability and accessibility goals.",
            risks: ["Data migration failures", "Downtime during transition"],
            kpis: ["99% system uptime", "100% user training completion", "90% migration success"],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Integrate ${p.product} with existing systems`, timeline: "Weeks 1-2", effortHours: 15, product: p.product, dependencies: p.product.includes('Azure') ? 'Subscription costs excluded' : 'None' },
              { task: `Test ${p.product} functionality`, timeline: "Weeks 3-4", effortHours: 10, product: p.product, dependencies: 'None' },
              { task: `Roll out ${p.product} to all users`, timeline: "Weeks 5-6", effortHours: 10, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'ITIL 4 service continuity' :
                         p.product.includes('M365') ? 'Microsoft security compliance' :
                         p.product.includes('Cybersecurity') ? 'NIST incident response' :
                         `Ensure full integration for ${p.product}`
            }))
          }
        ],
        nextSteps: `Review setup with ${clientName} within 2 weeks; procure necessary licenses within 1 month; schedule training within 3 weeks.`
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
      if (!roadmap.milestones.every(m => m.projectPlan && Array.isArray(m.projectPlan) && m.projectPlan.length >= 3 * products.length)) {
        console.error('Missing or insufficient projectPlan');
        throw new Error('Missing or incomplete projectPlan in API response');
      }
      console.log('Project plans included:', roadmap.milestones.every(m => m.projectPlan?.length > 0));
    } catch (e) {
      console.error('Invalid JSON or incomplete response:', apiResponseData.choices?.[0]?.message?.content || '', e.message);
      roadmap = {
        milestones: [
          {
            name: "Infrastructure Foundation",
            timeframe: "Months 1-4",
            deliverables: ["Deploy 1 unit of Managed Servers with daily backups", "Configure 1 unit of Managed Firewalls"],
            approach: "Establish a stable foundation by addressing server dependency and security concerns with tailored backups and firewall setup.",
            risks: ["Backup setup delays", "Firewall compatibility issues"],
            kpis: ["99.9% server uptime", "100% daily backup success", "Zero unauthorized access"],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              { task: `Assess ${p.product} for ${clientName}'s ${currentInfra.includes('server') ? 'server' : 'network'} needs`, timeline: "Weeks 1-2", effortHours: 10, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Configure ${p.product} per best practices`, timeline: "Weeks 3-4", effortHours: 15, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
              { task: `Train staff on ${p.product} usage`, timeline: "Weeks 5-6", effortHours: 10, product: p.product, dependencies: 'None' }
            ]),
            bestPractices: products.map(p => ({
              product: p.product,
              guideline: p.product.includes('Helpdesk') ? 'Follow ITIL 4 for incident management' :
                         p.product.includes('M365') ? 'Implement Microsoft Zero Trust' :
                         p.product.includes('Cybersecurity') ? 'Adhere to NIST guidelines' :
                         `Ensure standard deployment for ${p.product}`
            }))
          }
        ],
        nextSteps: `Review setup with ${clientName} within 2 weeks; procure necessary licenses within 1 month.`
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