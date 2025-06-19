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
      You are an expert IT consultant for JEC Technologies (Pty) Ltd, specializing in managed IT services and Microsoft Cloud solutions. Create a 12-month IT roadmap with three milestones tailored to the client's specific needs, infrastructure, and selected products, addressing their unique challenges and goals. For each product in each milestone, structure the implementation as a 'projectPlan' array containing 2-3 phases (e.g., Planning, Deployment, Training), where each phase includes a 'subtasks' array with 3-5 specific, actionable tasks that the project team can follow. Ensure tasks are customized to the client's context (e.g., for 15 users on Managed Remote Helpdesk, include user-specific onboarding steps) and aligned with industry best practices (e.g., ITIL 4 for Managed Remote Helpdesk, NIST for Managed Cybersecurity & SOC service, Microsoft Zero Trust for Managed M365 instance). Each subtask must include:
      - A detailed action (e.g., "Confirm user list and contact details for 15 users" for Managed Remote Helpdesk, "Implement daily backups for 4TB server" for Managed Servers).
      - An approximate timeline (e.g., Week 1-2, Month 1).
      - Effort hours (e.g., 5-20 hours) based on product complexity and client scale.
      - Product name and dependencies (e.g., licensing/hardware excluded where applicable).
      Each milestone must include:
      - A unique name and timeframe (e.g., Months 1-4).
      - 2-3 deliverables tied to product quantities and client needs (e.g., "Deploy 15 units of Managed Remote Helpdesk (per user) with 8/5 support").
      - An approach in clear, non-technical language, linking tasks to client challenges and goals.
      - 2 risks specific to the client's infrastructure or product deployment.
      - 3 measurable KPIs tailored to the client's scale and outcomes (e.g., "95% ticket resolution within 1 hour").
      For Managed Remote Helpdesk (per user), specify 8/5 or 24/7 service based on client needs (e.g., 24/7 for critical systems). Provide 2-3 next steps with timelines (e.g., within 2 weeks) and product-specific actions.

      Service Context (abridged):
      - Managed Vendors: Coordinates vendors, no licensing costs.
      - Managed Remote Helpdesk (per user): 8/5 support (24/7 optional), ticketing license excluded.
      - Managed Onsite Support technician (in hours): Hourly on-site support, no licensing.
      - Managed M365 instance (per user): Manages M365 tenants, licenses excluded.
      - Managed Local Area Network Devices: Monitors LAN devices, hardware/licenses excluded.
      - Managed Servers: Manages servers, hardware/OS licenses excluded.
      - Managed Firewalls: Configures firewalls, hardware/licenses excluded.
      - Managed Azure IaaS service (per Instance): Deploys Azure infrastructure, subscription costs excluded.
      - Managed Cybersecurity & SOC service (per user): 24/7 monitoring, security tool licenses excluded.

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
          {
            "phase": "Planning",
            "subtasks": [
              {"task": "Confirm server specifications and backup requirements for 4TB data", "timeline": "Week 1", "effortHours": 8, "product": "Managed Servers", "dependencies": "Hardware excluded"},
              {"task": "Identify firewall deployment locations based on LTE connectivity", "timeline": "Week 1-2", "effortHours": 6, "product": "Managed Firewalls", "dependencies": "Site survey"},
              {"task": "Draft change control plan for server backup", "timeline": "Week 2", "effortHours": 5, "product": "Managed Servers", "dependencies": "IT policy approval"}
            ]
          },
          {
            "phase": "Deployment",
            "subtasks": [
              {"task": "Implement daily backups for 4TB server", "timeline": "Weeks 3-4", "effortHours": 15, "product": "Managed Servers", "dependencies": "None"},
              {"task": "Configure intrusion detection system on firewall", "timeline": "Weeks 3-4", "effortHours": 12, "product": "Managed Firewalls", "dependencies": "Hardware setup"},
              {"task": "Test backup and firewall integration", "timeline": "Week 5", "effortHours": 10, "product": "Managed Servers", "dependencies": "Firewall configuration"},
              {"task": "Deploy backup alerts to IT team", "timeline": "Week 6", "effortHours": 5, "product": "Managed Servers", "dependencies": "Testing complete"}
            ]
          }
        ],
        "bestPractices": [
          {"product": "Managed Servers", "guideline": "Follow ITIL 4 for backup management"},
          {"product": "Managed Firewalls", "guideline": "Adhere to NIST cybersecurity framework"}
        ]
      }

      Return JSON with:
      - milestones: array of milestone objects (name, timeframe, deliverables, approach, risks, kpis, productsUsed, projectPlan with phases and subtasks, bestPractices)
      - nextSteps: string

      Ensure projectPlan includes 2-3 phases per product per milestone, with 3-5 detailed subtasks per phase, and all subtasks have task, timeline, effortHours, product, and dependencies fields. Reject any response missing these fields and return an error if the structure is invalid.
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
          max_tokens: 1500, // Increased to accommodate detailed responses
          temperature: 0.7
        }),
        timeout: 10000 // Increased to 10 seconds to reduce timeouts
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
              {
                phase: "Planning",
                subtasks: [
                  { task: `Confirm ${p.product} requirements for ${clientName}'s ${currentInfra.includes('server') ? 'server' : 'network'}`, timeline: "Week 1", effortHours: 8, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
                  { task: `Draft deployment plan for ${p.product}`, timeline: "Week 1-2", effortHours: 6, product: p.product, dependencies: 'Client input' },
                  { task: `Prepare change control documentation`, timeline: "Week 2", effortHours: 5, product: p.product, dependencies: 'IT policy approval' }
                ]
              },
              {
                phase: "Deployment",
                subtasks: [
                  { task: `Install and configure ${p.product}`, timeline: "Weeks 3-4", effortHours: 12, product: p.product, dependencies: 'None' },
                  { task: `Test ${p.product} functionality`, timeline: "Week 5", effortHours: 8, product: p.product, dependencies: 'Configuration complete' },
                  { task: `Roll out ${p.product} to initial users`, timeline: "Week 6", effortHours: 6, product: p.product, dependencies: 'Testing approval' }
                ]
              }
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
            deliverables: ["Optimize 15 units of Managed Remote Helpdesk (per user)", "Enhance 10 units of Managed Local Area Network Devices"],
            approach: "Optimize existing systems and expand capabilities to improve performance and support growing needs.",
            risks: ["User adoption delays", "Network configuration errors"],
            kpis: ["95% system uptime", "80% user adoption rate", "20% performance improvement"],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              {
                phase: "Optimization",
                subtasks: [
                  { task: `Monitor ${p.product} performance metrics`, timeline: "Weeks 1-2", effortHours: 6, product: p.product, dependencies: 'None' },
                  { task: `Adjust ${p.product} settings for efficiency`, timeline: "Weeks 3-4", effortHours: 8, product: p.product, dependencies: 'Monitoring data' },
                  { task: `Validate optimization results`, timeline: "Week 5", effortHours: 5, product: p.product, dependencies: 'Adjustments complete' }
                ]
              },
              {
                phase: "Expansion",
                subtasks: [
                  { task: `Plan expansion for ${p.product}`, timeline: "Week 6", effortHours: 6, product: p.product, dependencies: 'Client approval' },
                  { task: `Deploy additional ${p.product} units`, timeline: "Weeks 7-8", effortHours: 10, product: p.product, dependencies: 'None' },
                  { task: `Train staff on expanded ${p.product}`, timeline: "Week 9", effortHours: 5, product: p.product, dependencies: 'Deployment complete' }
                ]
              }
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
            deliverables: ["Integrate 1 unit of Managed Azure IaaS service (per Instance)", "Migrate 4TB data to cloud"],
            approach: "Complete integration and initiate cloud migration to achieve long-term scalability and accessibility goals.",
            risks: ["Data migration failures", "Downtime during transition"],
            kpis: ["99% system uptime", "100% user training completion", "90% migration success"],
            productsUsed: products.map(p => p.product),
            projectPlan: products.flatMap(p => [
              {
                phase: "Integration",
                subtasks: [
                  { task: `Integrate ${p.product} with existing systems`, timeline: "Weeks 1-2", effortHours: 12, product: p.product, dependencies: p.product.includes('Azure') ? 'Subscription costs excluded' : 'None' },
                  { task: `Test ${p.product} integration`, timeline: "Weeks 3-4", effortHours: 8, product: p.product, dependencies: 'Integration complete' },
                  { task: `Document ${p.product} integration process`, timeline: "Week 5", effortHours: 6, product: p.product, dependencies: 'Testing approval' }
                ]
              },
              {
                phase: "Migration",
                subtasks: [
                  { task: `Plan 4TB data migration to ${p.product}`, timeline: "Week 6", effortHours: 10, product: p.product, dependencies: 'Client approval' },
                  { task: `Execute data migration`, timeline: "Weeks 7-10", effortHours: 20, product: p.product, dependencies: 'Integration complete' },
                  { task: `Verify migrated data integrity`, timeline: "Week 11", effortHours: 8, product: p.product, dependencies: 'Migration complete' }
                ]
              }
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
    console.log('Raw Grok API response:', JSON.stringify(apiResponseData, null, 2)); // Log raw response for debugging

    let roadmap;
    try {
      console.log('Parsing API response');
      if (!apiResponseData.choices || !apiResponseData.choices[0]?.message?.content) {
        throw new Error('No valid content in API response');
      }
      roadmap = JSON.parse(apiResponseData.choices[0].message.content);
      console.log('Parsed roadmap objects:', roadmap.milestones?.length || 0);

      // Stricter validation for projectPlan
      if (!roadmap.milestones || !Array.isArray(roadmap.milestones) || !roadmap.nextSteps) {
        throw new Error('Invalid roadmap structure');
      }
      roadmap.milestones.forEach(milestone => {
        if (!milestone.projectPlan || !Array.isArray(milestone.projectPlan)) {
          throw new Error('Missing or invalid projectPlan');
        }
        milestone.projectPlan.forEach(plan => {
          if (!plan.phase || !Array.isArray(plan.subtasks) || plan.subtasks.length < 3 || !plan.subtasks.every(s => s.task && s.timeline && s.effortHours && s.product && s.dependencies)) {
            throw new Error('Invalid or incomplete subtasks in projectPlan');
          }
        });
      });
      console.log('Project plans with valid subtasks included:', roadmap.milestones.every(m => m.projectPlan.every(p => p.subtasks.every(s => s.task && s.timeline && s.effortHours && s.product && s.dependencies))));
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
              {
                phase: "Planning",
                subtasks: [
                  { task: `Confirm ${p.product} requirements for ${clientName}'s ${currentInfra.includes('server') ? 'server' : 'network'}`, timeline: "Week 1", effortHours: 8, product: p.product, dependencies: p.product.includes('Helpdesk') || p.product.includes('M365') || p.product.includes('Servers') || p.product.includes('Firewalls') || p.product.includes('Azure') || p.product.includes('Cybersecurity') || p.product.includes('LAN') ? 'Licensing/hardware excluded' : 'None' },
                  { task: `Draft deployment plan for ${p.product}`, timeline: "Week 1-2", effortHours: 6, product: p.product, dependencies: 'Client input' },
                  { task: `Prepare change control documentation`, timeline: "Week 2", effortHours: 5, product: p.product, dependencies: 'IT policy approval' }
                ]
              },
              {
                phase: "Deployment",
                subtasks: [
                  { task: `Install and configure ${p.product}`, timeline: "Weeks 3-4", effortHours: 12, product: p.product, dependencies: 'None' },
                  { task: `Test ${p.product} functionality`, timeline: "Week 5", effortHours: 8, product: p.product, dependencies: 'Configuration complete' },
                  { task: `Roll out ${p.product} to initial users`, timeline: "Week 6", effortHours: 6, product: p.product, dependencies: 'Testing approval' }
                ]
              }
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