import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			family: {
  				orange: {
  					'50': '#fff7ed',
  					'100': '#ffedd5',
  					'200': '#fed7aa',
  					'300': '#fdba74',
  					'400': '#fb923c',
  					'500': '#f97316',
  					'600': '#ea580c',
  					'700': '#c2410c',
  					'800': '#9a3412',
  					'900': '#7c2d12'
  				},
  				teal: {
  					'50': '#f0fdfa',
  					'100': '#ccfbf1',
  					'200': '#99f6e4',
  					'300': '#5eead4',
  					'400': '#2dd4bf',
  					'500': '#14b8a6',
  					'600': '#0d9488',
  					'700': '#0f766e',
  					'800': '#115e59',
  					'900': '#134e4a'
  				},
  				rose: {
  					'50': '#fff1f2',
  					'100': '#ffe4e6',
  					'200': '#fecdd3',
  					'300': '#fda4af',
  					'400': '#fb7185',
  					'500': '#f43f5e',
  					'600': '#e11d48',
  					'700': '#be123c',
  					'800': '#9f1239',
  					'900': '#881337'
  				}
  			},
  			calendar: {
  				red: '#ef4444',
  				orange: '#f97316',
  				amber: '#f59e0b',
  				yellow: '#eab308',
  				lime: '#84cc16',
  				green: '#22c55e',
  				emerald: '#10b981',
  				teal: '#14b8a6',
  				cyan: '#06b6d4',
  				sky: '#0ea5e9',
  				blue: '#3b82f6',
  				indigo: '#6366f1',
  				violet: '#8b5cf6',
  				purple: '#a855f7',
  				fuchsia: '#d946ef',
  				pink: '#ec4899',
  				rose: '#f43f5e'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'SF Pro Display',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'SF Mono',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'monospace'
  			]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				from: {
  					opacity: '1'
  				},
  				to: {
  					opacity: '0'
  				}
  			},
  			'slide-in-from-top': {
  				from: {
  					transform: 'translateY(-100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-from-bottom': {
  				from: {
  					transform: 'translateY(100%)'
  				},
  				to: {
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-from-left': {
  				from: {
  					transform: 'translateX(-100%)'
  				},
  				to: {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-in-from-right': {
  				from: {
  					transform: 'translateX(100%)'
  				},
  				to: {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-out-to-top': {
  				from: {
  					transform: 'translateY(0)'
  				},
  				to: {
  					transform: 'translateY(-48%)'
  				}
  			},
  			'slide-out-to-left': {
  				from: {
  					transform: 'translateX(0)'
  				},
  				to: {
  					transform: 'translateX(-50%)'
  				}
  			},
  			'pulse-soft': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.7'
  				}
  			},
  			'sync-spin': {
  				from: {
  					transform: 'rotate(0deg)'
  				},
  				to: {
  					transform: 'rotate(360deg)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-out': 'fade-out 0.2s ease-out',
  			'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
  			'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
  			'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
  			'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
  			'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
  			'sync-spin': 'sync-spin 1s linear infinite'
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem',
  			'112': '28rem',
  			'128': '32rem'
  		},
  		minHeight: {
  			'touch': '44px'
  		},
  		minWidth: {
  			'touch': '44px'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
};

export default config;
