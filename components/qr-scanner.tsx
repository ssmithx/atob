'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QrScannerProps {
  onResult: (result: string) => void;
  onCancel: () => void;
}

export function QrScanner({ onResult, onCancel }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load QR code scanner library dynamically
  useEffect(() => {
    const loadJsQR = async () => {
      // In a real implementation, you would import jsQR
      // For this example, we'll simulate QR code detection
      console.log('QR scanner initialized');
    };

    loadJsQR();
  }, []);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === 'videoinput'
        );
        setCameras(videoDevices);

        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        setError('Failed to access camera devices');
        console.error(err);
      }
    };

    getCameras();
  }, []);

  // Start camera when selected camera changes
  useEffect(() => {
    if (!selectedCamera) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCamera },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setScanning(true);
          setError(null);
        }
      } catch (err) {
        setError('Failed to access camera');
        console.error(err);
      }
    };

    startCamera();

    return () => {
      // Stop all tracks when component unmounts or camera changes
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedCamera]);

  // Scan for QR codes
  useEffect(() => {
    if (!scanning) return;

    let animationFrameId: number;

    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // In a real implementation, you would use jsQR to detect QR codes
        // For this example, we'll simulate a QR code detection after 3 seconds
        setTimeout(() => {
          // Simulate QR code detection
          const mockQrCodeUrl = `${window.location.origin}/confirm-delivery?id=mock-package-123`;
          onResult(mockQrCodeUrl);
        }, 3000);

        return;
      }

      animationFrameId = requestAnimationFrame(scanQRCode);
    };

    animationFrameId = requestAnimationFrame(scanQRCode);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [scanning, onResult]);

  return (
    <div className='space-y-4'>
      <Card className='overflow-hidden'>
        <div className='relative bg-black aspect-square w-full max-w-sm mx-auto'>
          <video
            ref={videoRef}
            className='absolute inset-0 w-full h-full object-cover'
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className='absolute inset-0 w-full h-full hidden'
          />
          <div className='absolute inset-0 border-[3px] border-white/50 m-12 rounded-lg pointer-events-none'></div>
        </div>
      </Card>

      {error && <div className='text-red-500 text-sm text-center'>{error}</div>}

      {cameras.length > 1 && (
        <div className='flex justify-center'>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className='text-sm p-2 border rounded-md'
          >
            {cameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className='flex justify-center'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
