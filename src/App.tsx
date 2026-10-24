import { useEffect } from 'react';
import { TabBar, tabs } from './components/TabBar';
import { OpenFromHomeScreen } from './components/OpenFromHomeScreen';
import { useRoute } from './lib/router';
import { isIOS, isInstalledApp, requestPersistentStorage } from './lib/device';
import { TodayScreen } from './screens/TodayScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { HobbiesScreen } from './screens/HobbiesScreen';
import { HobbyScreen } from './screens/HobbyScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { RoutinesScreen } from './screens/RoutinesScreen';
import { MoreScreen } from './screens/MoreScreen';
import { ImportScreen } from './screens/ImportScreen';
import { BackupScreen } from './screens/BackupScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { MediaScreen } from './screens/MediaScreen';
import { TasksScreen } from './screens/TasksScreen';

const screens: Record<string, () => React.JSX.Element | null> = {
  '/today': TodayScreen,
  '/calendar': CalendarScreen,
  '/hobbies': HobbiesScreen,
  '/routines': RoutinesScreen,
  '/more': MoreScreen,
  '/more/import': ImportScreen,
  '/more/backup': BackupScreen,
  '/more/tasks': TasksScreen,
  '/more/media': MediaScreen,
  '/more/goals': GoalsScreen,
};

export function App() {
  const path = useRoute();

  useEffect(() => {
    if (isInstalledApp()) requestPersistentStorage();
  }, []);

  // On an iPhone, Safari has its own separate (empty) storage, so point people to the installed app (D11).
  // On a computer the app runs normally, which is how it gets developed and previewed.
  if (isIOS() && !isInstalledApp()) return <OpenFromHomeScreen />;

  // Project pages belong under the Hobbies tab.
  const tabPath = path.startsWith('/projects/') ? '/hobbies' : path;
  const tab = tabs.find((t) => tabPath.startsWith(t.path)) ?? tabs[0];
  const Screen = screens[path] ?? screens[tab.path];
  const hobbyId = /^\/hobbies\/(.+)$/.exec(path)?.[1];
  const projectId = /^\/projects\/(.+)$/.exec(path)?.[1];

  return (
    <>
      {hobbyId ? <HobbyScreen key={hobbyId} id={hobbyId} />
        : projectId ? <ProjectScreen key={projectId} id={projectId} />
        : <Screen />}
      <TabBar current={tab.path} />
    </>
  );
}
