import { AccountQuestionnaire } from './account-questionnaire';

describe('AccountQuestionnaire', () => {
  let questionnaire: AccountQuestionnaire;

  beforeEach(() => {
    questionnaire = new AccountQuestionnaire();
  });

  it('validates owner units and only allows rentals linked to registered units', () => {
    questionnaire.floor = '4';
    questionnaire.unitNumber = 'B';
    questionnaire.chooseHasOtherUnits(true);
    questionnaire.otherUnits[0] = { ...questionnaire.otherUnits[0], floor: '5', number: 'A' };
    questionnaire.addUnit(questionnaire.otherUnits);
    questionnaire.otherUnits[1] = { ...questionnaire.otherUnits[1], floor: '6', number: 'C' };
    questionnaire.chooseRented(true);

    expect(questionnaire.ownerUnitsValid).toBe(false);
    questionnaire.toggleRentedUnit(questionnaire.otherUnits[1]);
    expect(questionnaire.ownerUnitsValid).toBe(true);
    expect(questionnaire.rentedUnitsText()).toBe('Piso 6, unidad C');

    questionnaire.otherUnits[1].floor = '4';
    questionnaire.otherUnits[1].number = 'b';
    expect(questionnaire.duplicateUnits).toBe(true);
    expect(questionnaire.ownerUnitsValid).toBe(false);
  });

  it('removes rental selections when their unit is removed and clears owner data when the answer changes', () => {
    questionnaire.floor = '1';
    questionnaire.unitNumber = 'A';
    questionnaire.chooseHasOtherUnits(true);
    questionnaire.otherUnits[0] = { ...questionnaire.otherUnits[0], floor: '2', number: 'B' };
    questionnaire.chooseRented(true);
    questionnaire.toggleRentedUnit(questionnaire.otherUnits[0]);
    questionnaire.removeUnit(questionnaire.otherUnits, 0);

    expect(questionnaire.rentedUnits).toEqual([]);
    questionnaire.chooseHasOtherUnits(false);
    expect(questionnaire.otherUnits).toEqual([]);
    expect(questionnaire.hasRentedUnits).toBe(false);
  });

  it('ends the agency branch without owner questions and clears owner data on method change', () => {
    questionnaire.chooseRole('tenant');
    questionnaire.current = 'tenant-home';
    questionnaire.floor = '3';
    questionnaire.unitNumber = 'C';
    questionnaire.changeRentalMethod('direct');
    questionnaire.next();
    expect(questionnaire.current).toBe('tenant-owner');

    questionnaire.ownerName = 'Ana Pérez';
    questionnaire.ownerLivesHere = true;
    questionnaire.back();
    questionnaire.changeRentalMethod('agency');
    expect(questionnaire.ownerName).toBe('');
    expect(questionnaire.ownerLivesHere).toBeNull();
    questionnaire.next();
    expect(questionnaire.current).toBe('summary');
    expect(questionnaire.currentSteps).not.toContain('tenant-owner');
  });

  it('preserves valid answers when navigating back and recalculates progress by role', () => {
    questionnaire.current = 'role';
    questionnaire.chooseRole('staff');
    questionnaire.next();
    expect(questionnaire.current).toBe('staff-details');
    expect(questionnaire.currentSteps.length).toBe(4);
    questionnaire.staffFunction = 'Limpieza';
    questionnaire.staffSchedule = '';
    expect(questionnaire.canContinue()).toBe(true);
    questionnaire.next();
    expect(questionnaire.current).toBe('summary');
    questionnaire.back();
    expect(questionnaire.staffFunction).toBe('Limpieza');
    expect(questionnaire.staffSchedule).toBe('');
  });

  it('requires a custom staff function only when Otro is selected and clears it when leaving Otro', () => {
    questionnaire.current = 'staff-details';
    questionnaire.chooseStaffFunction('Otro');
    expect(questionnaire.canContinue()).toBe(false);
    questionnaire.staffFunctionOther = 'Jardinería';
    expect(questionnaire.canContinue()).toBe(true);
    questionnaire.chooseStaffFunction('Mantenimiento');
    expect(questionnaire.staffFunctionOther).toBe('');
    expect(questionnaire.canContinue()).toBe(true);
  });

  it('clears profile answers after changing to another role', () => {
    questionnaire.chooseRole('owner');
    questionnaire.floor = '8';
    questionnaire.unitNumber = 'D';
    questionnaire.chooseHasOtherUnits(true);
    questionnaire.otherUnits[0] = { ...questionnaire.otherUnits[0], floor: '9', number: 'A' };
    questionnaire.chooseRole('tenant');

    expect(questionnaire.floor).toBe('');
    expect(questionnaire.unitNumber).toBe('');
    expect(questionnaire.otherUnits).toEqual([]);
    expect(questionnaire.currentSteps).toEqual(['account', 'role', 'tenant-info', 'tenant-home', 'summary']);
  });
});
