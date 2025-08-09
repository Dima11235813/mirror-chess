import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { IonApp, IonContent, setupIonicReact } from '@ionic/react'
import App from './App'
import './styles.css'

setupIonicReact()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IonApp>
      <IonContent>
        <App />
      </IonContent>
    </IonApp>
  </StrictMode>
)


