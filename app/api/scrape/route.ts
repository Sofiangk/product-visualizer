import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ScraperRequest {
  scraper: 'amazon' | 'additional_images';
  csvData: string;
  filename: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ScraperRequest = await request.json();
    const { scraper, csvData, filename } = body;

    // Determine scraper script path
    const scraperMap = {
      amazon: 'scraper_amazon.py',
      additional_images: 'scraper_additional_images.py',
    };

    const scraperScript = scraperMap[scraper];
    if (!scraperScript) {
      return NextResponse.json(
        { error: 'Invalid scraper type' },
        { status: 400 }
      );
    }

    // Get the project root (parent of product-visualizer)
    const projectRoot = path.join(process.cwd(), '..');
    const scraperPath = path.join(projectRoot, scraperScript);
    const inputPath = path.join(projectRoot, filename);
    const outputPath = path.join(projectRoot, `${path.parse(filename).name}_updated.csv`);

    // Check if scraper exists
    if (!fs.existsSync(scraperPath)) {
      return NextResponse.json(
        { error: `Scraper not found: ${scraperScript}` },
        { status: 404 }
      );
    }

    // Write CSV data to file
    fs.writeFileSync(inputPath, csvData, 'utf-8');

    // Return streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Run Python scraper
          const outputFilename = `${path.parse(filename).name}_updated.csv`;
          const pythonProcess = spawn('python3', [scraperPath, filename, outputFilename], {
            cwd: projectRoot,
          });

          pythonProcess.stdout.on('data', (data) => {
            const message = JSON.stringify({
              type: 'stdout',
              data: data.toString(),
            }) + '\n';
            controller.enqueue(encoder.encode(message));
          });

          pythonProcess.stderr.on('data', (data) => {
            const message = JSON.stringify({
              type: 'stderr',
              data: data.toString(),
            }) + '\n';
            controller.enqueue(encoder.encode(message));
          });

          pythonProcess.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
              // Read the output file
              const outputData = fs.readFileSync(outputPath, 'utf-8');
              const message = JSON.stringify({
                type: 'complete',
                data: outputData,
                filename: path.basename(outputPath),
              }) + '\n';
              controller.enqueue(encoder.encode(message));
              
              // Clean up files
              try {
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
              } catch (e) {
                console.error('Error cleaning up files:', e);
              }
            } else {
              const message = JSON.stringify({
                type: 'error',
                data: `Scraper exited with code ${code}`,
              }) + '\n';
              controller.enqueue(encoder.encode(message));
            }
            controller.close();
          });

          pythonProcess.on('error', (error) => {
            const message = JSON.stringify({
              type: 'error',
              data: error.message,
            }) + '\n';
            controller.enqueue(encoder.encode(message));
            controller.close();
          });
        } catch (error) {
          const message = JSON.stringify({
            type: 'error',
            data: error instanceof Error ? error.message : 'Unknown error',
          }) + '\n';
          controller.enqueue(encoder.encode(message));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Scraper API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
