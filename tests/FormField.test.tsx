import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FormField from '../components/ui/form-field';

describe('FormField', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <FormField label="Habit Name" value="" onChangeText={jest.fn()} />
    );
    expect(getByText('Habit Name')).toBeTruthy();
  });

  it('fires onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <FormField label="Habit Name" value="" onChangeText={onChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText('Habit Name'), 'Morning Run');
    expect(onChangeText).toHaveBeenCalledWith('Morning Run');
  });

  it('uses a custom placeholder when provided', () => {
    const { getByPlaceholderText } = render(
      <FormField
        label="Notes"
        value=""
        onChangeText={jest.fn()}
        placeholder="Add a note…"
      />
    );
    expect(getByPlaceholderText('Add a note…')).toBeTruthy();
  });
});
