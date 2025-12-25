
import React from 'react';

export interface SantaState {
  position: [number, number, number];
  rotation: [number, number, number];
  speed: number;
  altitude: number;
  giftsDelivered: number;
  locationName: string;
  nextStop: string;
  currentRegion: string;
  localTime: string;
  coordinates: [number, number]; // Lat, Lon
  visitedLocations: [number, number][]; // Array of [Lat, Lon]
}

export interface IntelLogEntry {
  id: string;
  timestamp: string;
  message: string;
  priority: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
}

export enum ViewMode {
  OPTICAL = 'OPTICAL',
  THERMAL = 'THERMAL',
  NIGHT_VISION = 'NIGHT_VISION'
}

export interface TrackingLocation {
  name: string;
  offset: number; // UTC Offset
  region: string;
  coordinates: [number, number]; // Lat, Lon
}

// Global JSX augmentation for React Three Fiber to fix intrinsic element type errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
        group: any;
        mesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
        cylinderGeometry: any;
        meshBasicMaterial: any;
        sphereGeometry: any;
        planeGeometry: any;
        shaderMaterial: any;
        fog: any;
        ambientLight: any;
        pointLight: any;
        directionalLight: any;
        ringGeometry: any;
        primitive: any;
        bufferGeometry: any;
        lineBasicMaterial: any;
        [elemName: string]: any;
    }
  }
}

// Augment the 'react' module to ensure JSX types are picked up correctly
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
        group: any;
        mesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
        cylinderGeometry: any;
        meshBasicMaterial: any;
        sphereGeometry: any;
        planeGeometry: any;
        shaderMaterial: any;
        fog: any;
        ambientLight: any;
        pointLight: any;
        directionalLight: any;
        ringGeometry: any;
        primitive: any;
        bufferGeometry: any;
        lineBasicMaterial: any;
        [elemName: string]: any;
    }
  }
}