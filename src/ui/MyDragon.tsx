// The player's own dragon, dressed in whatever they have on from the shop.
import { Dragon, type DragonProps } from './Dragon';
import { useProgress } from './store';

export function MyDragon(props: Omit<DragonProps, 'skin' | 'outfit'>) {
  const { progress } = useProgress();
  return <Dragon {...props} title={props.title ?? progress.profile?.dragonName} skin={progress.shop.skin} outfit={progress.shop.outfit} />;
}
