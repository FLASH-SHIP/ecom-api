import { useNavbarTheme } from "../@app/core/AppSettings/hooks/themeHooks";
import AppTheme from "../@app/core/AppTheme";

type NavbarThemeProps = {
  children: React.ReactNode;
};

function NavbarTheme({ children }: NavbarThemeProps) {
  const navbarTheme = useNavbarTheme();

  return <AppTheme theme={navbarTheme}>{children}</AppTheme>;
}

export default NavbarTheme;
