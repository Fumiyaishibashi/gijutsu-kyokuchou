#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { GijutsuKyokuchouStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
new GijutsuKyokuchouStack(app, 'GijutsuKyokuchouStack', {
  env: { 
    account: '727598134232', 
    region: 'us-east-1' 
  },
  description: '技術局長 - 放送機器安全確認アプリ (MBS Hackathon 2026 C班)'
});
