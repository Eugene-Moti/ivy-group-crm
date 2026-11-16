/**
 * Re-mounts on every navigation, so each page arrives with the same soft
 * rise-and-focus entrance (.orion-page in globals.css; off under reduced
 * motion). The wrapper ends with no transform or filter, so fixed-position
 * children behave normally once the entrance finishes.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="orion-page">{children}</div>;
}
