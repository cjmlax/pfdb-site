import type { ReactNode } from 'react';
import ComboBox from './ComboBox';
import FrogTextInput from './FrogTextInput';
import type { FrogSel } from '../utils/frogIds';
import type { FrogOptions } from '../hooks/useFrogOptions';
import { useFrogEntry } from '../hooks/useFrogEntry';
import FrogSprite from './FrogSprite';

// Base / Secondary / Breed pickers for one frog — or, with the text-entry site
// setting, one box taking its exact Frog_ID or full name. Both only read their
// selection on mount, so remount (change the key) to load a different frog.
// `hideBreed` drops the Breed dropdown when the page sets the breed itself; the
// text box still takes a whole frog, so the page checks the breed it gets.
// `sprite` shows the picked frog, rendered, in the box's top-right corner once
// all three traits are chosen; it sits in the space beside the title, so the
// box doesn't grow.
export default function FrogInputs({
  title, sel, onChange, options, hideBreed = false, sprite = false, children,
}: {
  title: string;
  sel: FrogSel;
  onChange: (s: FrogSel) => void;
  options: Pick<FrogOptions, 'baseOpts' | 'secOpts' | 'breedOpts' | 'lookup'>;
  hideBreed?: boolean;
  sprite?: boolean;
  children?: ReactNode;
}) {
  const { entry } = useFrogEntry();
  return (
    <div className="parent-group">
      <h2 className="parent-title">{title}</h2>
      {sprite && sel.base && sel.sec && sel.breed && (
        <FrogSprite
          className="parent-sprite"
          baseId={sel.base.id}
          secId={sel.sec.id}
          breedId={sel.breed.id}
          title={`${sel.base.label} ${sel.sec.label} ${sel.breed.label}`}
        />
      )}
      {entry === 'text' ? (
        <FrogTextInput sel={sel} onChange={onChange} lookup={options.lookup} />
      ) : (
        <>
          <ComboBox
            label="Base Color"
            options={options.baseOpts}
            presorted
            initialSelection={sel.base}
            onSelect={o => onChange({ ...sel, base: o })}
          />
          <ComboBox
            label="Secondary Color"
            options={options.secOpts}
            presorted
            initialSelection={sel.sec}
            onSelect={o => onChange({ ...sel, sec: o })}
          />
          {!hideBreed && (
            <ComboBox
              label="Breed"
              options={options.breedOpts}
              presorted
              initialSelection={sel.breed}
              onSelect={o => onChange({ ...sel, breed: o })}
            />
          )}
        </>
      )}
      {children}
    </div>
  );
}
