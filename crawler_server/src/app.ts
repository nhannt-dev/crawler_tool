import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import crawlRoutes from './routes/crawl.routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Load environment variables
dotenv.config();

/**
 * Express Application Setup
 */
class App {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middlewares
   */
  private initializeMiddlewares(): void {
    // CORS
    this.app.use(cors());

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: () => void) => {
      console.log(`📥 ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    this.app.use('/api', crawlRoutes);
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler (must be after all routes)
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start server
   */
  public async start(): Promise<void> {
    try {
      // Test database connection
      await testConnection();

      // Start listening
      this.app.listen(this.port, () => {
        console.log('=================================');
        console.log(`🚀 Server running on port ${this.port}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Health check: http://localhost:${this.port}/health`);
        console.log(`📚 API Base URL: http://localhost:${this.port}/api`);
        console.log('=================================');
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start application
const application = new App();
application.start();

export default application.app;
