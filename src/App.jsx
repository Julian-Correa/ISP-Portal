import { useState } from "react";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import PopupImage from "./components/PopupImage.jsx";
import LoginScreen from "./components/screens/LoginScreen.jsx";
import ProfileScreen from "./components/screens/ProfileScreen.jsx";
import { POPUP_CONFIG } from "./lib/config/portalConfig.js";

export default function App() {
  const [session, setSession] = useState(null);

  const updateCustomer = (nextCustomer) => {
    setSession((previousSession) => (
      previousSession ? { ...previousSession, customer: nextCustomer } : previousSession
    ));
  };

  return (
    <ErrorBoundary>
      {session ? (
        <>
          <PopupImage config={POPUP_CONFIG} />
          <ProfileScreen
            customer={session.customer}
            invoiceUrl={session.invoiceUrl}
            planInfo={session.planInfo}
            onUpdateCustomer={updateCustomer}
            onLogout={() => setSession(null)}
          />
        </>
      ) : (
        <LoginScreen onLogin={setSession} />
      )}
    </ErrorBoundary>
  );
}
