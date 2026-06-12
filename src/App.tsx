import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { WeatherScreen } from "./screens/WeatherScreen";

function App() {
  const swRegistrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

  useRegisterSW({
    onRegisteredSW(_url, registration) {
      swRegistrationRef.current = registration;
    },
  });

  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible") swRegistrationRef.current?.update();
    };
    document.addEventListener("visibilitychange", update);
    const interval = setInterval(() => swRegistrationRef.current?.update(), 60 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", update);
      clearInterval(interval);
    };
  }, []);

  return <WeatherScreen />;
}

export default App;
