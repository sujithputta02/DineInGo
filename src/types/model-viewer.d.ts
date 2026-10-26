import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          'ios-src'?: string;
          alt?: string;
          ar?: boolean;
          'ar-modes'?: string;
          'ar-scale'?: string;
          'ar-placement'?: 'floor' | 'wall';
          'camera-controls'?: boolean;
          'auto-rotate'?: boolean;
          'rotation-per-second'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'interaction' | 'manual';
          poster?: string;
          'shadow-intensity'?: string;
          'shadow-softness'?: string;
          exposure?: string;
          'camera-orbit'?: string;
          'min-camera-orbit'?: string;
          'max-camera-orbit'?: string;
          'field-of-view'?: string;
          'environment-image'?: string;
          crossorigin?: string;
          ref?: React.Ref<any>;
        },
        HTMLElement
      >;
    }
  }
}
