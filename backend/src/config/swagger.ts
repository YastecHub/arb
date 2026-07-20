import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ULESS ARB ResearchHub API Documentation',
    version: '2.0.0',
    description:
      'Complete RESTful API documentation for ULES Academic & Research Board (ARB) ResearchHub. Handles authentication, submission pipeline, peer review thread, public digital library, AI assistant, and administrative management.',
    contact: {
      name: 'ULES ARB Technical Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
    {
      url: '/',
      description: 'Current Environment Host',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr_123456789' },
          email: { type: 'string', example: 'student@unilag.edu.ng' },
          name: { type: 'string', example: 'Adebayo Okon' },
          role: { type: 'string', enum: ['student', 'admin'], example: 'student' },
          matric_number: { type: 'string', example: '190407001' },
          department: { type: 'string', example: 'Electrical & Electronics Engineering' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Paper: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'sub_987654321' },
          title: { type: 'string', example: 'Autonomous Drone Navigation Using Computer Vision' },
          abstract: { type: 'string', example: 'This paper proposes a deep-learning visual odometry model...' },
          author_name: { type: 'string', example: 'Adebayo Okon' },
          author_email: { type: 'string', example: 'student@unilag.edu.ng' },
          department: { type: 'string', example: 'Electrical & Electronics Engineering' },
          session: { type: 'string', example: '2023/2024' },
          tags: { type: 'array', items: { type: 'string' }, example: ['Robotics', 'Computer Vision'] },
          status: { type: 'string', example: 'published' },
          published_at: { type: 'string', format: 'date-time' },
          download_count: { type: 'integer', example: 42 },
          view_count: { type: 'integer', example: 128 },
          has_pdf: { type: 'boolean', example: true },
        },
      },
      SubmissionThreadEvent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          submission_id: { type: 'string' },
          actor_id: { type: 'string' },
          actor_name: { type: 'string' },
          actor_role: { type: 'string', enum: ['student', 'admin', 'system'] },
          event_type: {
            type: 'string',
            enum: ['submitted', 'revision_requested', 'resubmitted', 'approved', 'rejected', 'comment', 'unpublished', 'republished'],
          },
          body: { type: 'string' },
          has_pdf: { type: 'boolean' },
          pdf_name: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Unauthorized access' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System Health Check',
        tags: ['Health'],
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    service: { type: 'string', example: 'arb-researchhub' },
                    env: { type: 'string', example: 'development' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ---------------- AUTH ----------------
    '/api/auth/register': {
      post: {
        summary: 'Register a new student or admin user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'student@unilag.edu.ng' },
                  password: { type: 'string', format: 'password', example: 'Secret123!' },
                  name: { type: 'string', example: 'Adebayo Okon' },
                  role: { type: 'string', enum: ['student', 'admin'], default: 'student' },
                  matric_number: { type: 'string', example: '190407001' },
                  department: { type: 'string', example: 'Electrical & Electronics Engineering' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Invalid input or email already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user and get JWT token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'student@unilag.edu.ng' },
                  password: { type: 'string', format: 'password', example: 'Secret123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ---------------- SUBMISSIONS ----------------
    '/api/submissions': {
      get: {
        summary: 'Get student submissions',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Paper' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Submit a new research paper (PDF)',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['title', 'abstract', 'department', 'document'],
                properties: {
                  title: { type: 'string' },
                  abstract: { type: 'string' },
                  department: { type: 'string' },
                  session: { type: 'string', example: '2023/2024' },
                  tags: { type: 'string', description: 'Comma separated tags' },
                  document: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Paper submitted successfully' },
        },
      },
    },
    '/api/submissions/{id}': {
      get: {
        summary: 'Get submission by ID',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Paper' } } } },
        },
      },
    },
    '/api/submissions/{id}/thread': {
      get: {
        summary: 'Get submission review thread history',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/SubmissionThreadEvent' } },
              },
            },
          },
        },
      },
    },
    '/api/submissions/{id}/resubmit': {
      post: {
        summary: 'Upload revised PDF in response to revision request',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  note: { type: 'string' },
                  document: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Resubmitted successfully' },
        },
      },
    },
    '/api/submissions/{id}/thread/{eventId}/download': {
      get: {
        summary: 'Download attachment from a submission thread event',
        tags: ['Submissions'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
        },
      },
    },

    // ---------------- PUBLIC LIBRARY ----------------
    '/api/library': {
      get: {
        summary: 'Browse published papers with filters',
        tags: ['Digital Library'],
        parameters: [
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'session', in: 'query', schema: { type: 'string' } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { $ref: '#/components/schemas/Paper' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    pageSize: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/library/facets': {
      get: {
        summary: 'Get library filter facets (departments, sessions, tags)',
        tags: ['Digital Library'],
        responses: {
          200: { description: 'Facets retrieved' },
        },
      },
    },
    '/api/library/search': {
      get: {
        summary: 'Search published research papers (Keyword or AI Hybrid Vector Search)',
        tags: ['Digital Library'],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'mode', in: 'query', schema: { type: 'string', enum: ['keyword', 'ai'], default: 'keyword' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Search results' },
        },
      },
    },
    '/api/library/{id}': {
      get: {
        summary: 'Get published paper metadata by ID',
        tags: ['Digital Library'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Paper' } } } },
        },
      },
    },
    '/api/library/{id}/download': {
      get: {
        summary: 'Stream / Download published paper PDF file',
        tags: ['Digital Library'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } },
        },
      },
    },

    // ---------------- ASSISTANT ----------------
    '/api/assistant/chat': {
      post: {
        summary: 'Ask ARB AI Research Assistant',
        tags: ['AI Assistant'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', example: 'What are recent papers on solar energy efficiency?' },
                  history: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'AI Assistant reply' },
        },
      },
    },

    // ---------------- NOTIFICATIONS ----------------
    '/api/notifications': {
      get: {
        summary: 'Get user notifications',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User notifications' },
        },
      },
    },
    '/api/notifications/read-all': {
      post: {
        summary: 'Mark all notifications as read',
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Notifications marked as read' },
        },
      },
    },

    // ---------------- ADMIN ----------------
    '/api/admin/submissions': {
      get: {
        summary: 'List all pending/reviewed submissions (Admin only)',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of submissions' },
        },
      },
    },
    '/api/admin/submissions/{id}': {
      get: {
        summary: 'Get submission detail for admin review',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Submission details' },
        },
      },
    },
    '/api/admin/submissions/{id}/approve': {
      post: {
        summary: 'Approve and publish submission to public library',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Approved and published' } },
      },
    },
    '/api/admin/submissions/{id}/request-revision': {
      post: {
        summary: 'Send revision request to author',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'Revision requested' } },
      },
    },
    '/api/admin/submissions/{id}/reject': {
      post: {
        summary: 'Reject submission',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Submission rejected' } },
      },
    },
    '/api/admin/submissions/{id}/download': {
      get: {
        summary: 'Download submitted PDF for admin review',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } } },
      },
    },
    '/api/admin/papers/{id}/unpublish': {
      post: {
        summary: 'Unpublish a paper from the public library',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Unpublished' } },
      },
    },
    '/api/admin/papers/{id}/republish': {
      post: {
        summary: 'Republish an unpublished paper',
        tags: ['Admin Review Desk'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Republished' } },
      },
    },
    '/api/admin/users': {
      get: {
        summary: 'List system users (Admin only)',
        tags: ['Admin User Management'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'List of users' } },
      },
    },
    '/api/admin/users/{id}/role': {
      patch: {
        summary: 'Update user role (student <-> admin)',
        tags: ['Admin User Management'],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: { role: { type: 'string', enum: ['student', 'admin'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Role updated' } },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  swaggerDefinition,
  apis: [],
});
