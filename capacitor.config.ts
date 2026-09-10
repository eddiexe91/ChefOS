import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CHEFOS_ANDROID_URL ?? 'http://10.0.2.2:3000'

const config: CapacitorConfig = {
  appId: 'com.chefos.app',
  appName: 'ChefOS',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: ['*'],
  },
  android: {
    backgroundColor: '#080808',
  },
}

export default config
