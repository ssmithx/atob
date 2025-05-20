import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Chrome, Globe } from 'lucide-react';
import Link from 'next/link';

export function QuickStartGuide() {
  return (
    <Card className="max-w-2xl mx-auto border border-gray-100 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-gray-100">
        <CardTitle className="text-gray-900">Quick Start Guide</CardTitle>
        <CardDescription>
          Get started with Alby in just a few simple steps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <Chrome className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Step 1: Install Alby</h3>
              <p className="text-sm text-gray-500">
                Install the Alby extension for Chrome or Firefox
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => window.open('https://getalby.com', '_blank')}
                >
                  <Chrome className="h-4 w-4" />
                  Chrome
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => window.open('https://addons.mozilla.org/en-US/firefox/addon/alby/', '_blank')}
                >
                  <Globe className="h-4 w-4" />
                  Firefox
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Step 2: Create Your Account</h3>
              <p className="text-sm text-gray-500">
                Click the Alby icon in your browser and follow these steps:
              </p>
              <ul className="text-sm text-gray-500 mt-2 space-y-1 list-disc list-inside">
                <li>Click "Create Account"</li>
                <li>Choose a username and password</li>
                <li>Save your backup phrase in a secure place</li>
                <li>Complete the setup process</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ArrowRight className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Step 3: Connect to A to ₿</h3>
              <p className="text-sm text-gray-500">
                Once Alby is set up, click the "Connect" button below to start using the app
              </p>
              <div className="mt-2">
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-[#FF7170] to-[#FFE57F] text-white">
                    Connect with Alby
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Make sure to use Chrome or Firefox browser</li>
            <li>Keep your backup phrase safe - you'll need it to recover your account</li>
            <li>If you already have an Alby account, you can skip to Step 3</li>
            <li>For the best experience, use the same browser where you installed Alby</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 