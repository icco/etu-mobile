/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { name } from '../app.json';

describe('native app registration', () => {
  it('uses the exact React version embedded in the native renderer', () => {
    const renderer = readFileSync(
      join(__dirname, '../node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-prod.js'),
      'utf8',
    );
    const reactPackage = JSON.parse(readFileSync(
      join(__dirname, '../node_modules/react/package.json'), 'utf8',
    )) as { version: string };
    const rendererVersion = renderer.match(/reconcilerVersion:\s*"([^"]+)"/);
    expect(rendererVersion).not.toBeNull();
    expect(reactPackage.version).toBe(rendererVersion?.[1]);
  });
  it('registers the component Android launches', () => {
    const activity = readFileSync(
      join(__dirname, '../android/app/src/main/java/com/etumobileapp/MainActivity.kt'),
      'utf8',
    );
    const component = activity.match(/getMainComponentName\(\): String = "([^"]+)"/);
    expect(component).not.toBeNull();
    expect(name).toBe(component?.[1]);
  });

  it('registers the component iOS launches', () => {
    const delegate = readFileSync(
      join(__dirname, '../ios/EtuMobileApp/AppDelegate.swift'),
      'utf8',
    );
    const component = delegate.match(/withModuleName: "([^"]+)"/);
    expect(component).not.toBeNull();
    expect(name).toBe(component?.[1]);
  });
});
