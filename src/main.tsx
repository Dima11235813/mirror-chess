import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { IonApp, IonContent, setupIonicReact } from '@ionic/react'
import App from './App'
import './styles.css'

// Configure Ionic with theme support
setupIonicReact({
  // mode: 'ios', // Use iOS mode for consistent styling
  mode: 'md', // Use Material mode for consistent styling
  animated: true,
  rippleEffect: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IonApp>
      <IonContent>
        <App />
      </IonContent>
    </IonApp>
  </StrictMode>
)


