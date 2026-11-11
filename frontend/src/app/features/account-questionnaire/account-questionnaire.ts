import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../shared/components/atoms/card/card.component';
import { InputComponent } from '../../shared/components/atoms/input/input';

type Role = 'owner' | 'tenant' | 'staff';
type Step = 'account' | 'role' | 'owner-info' | 'owner-home' | 'owner-units' | 'tenant-info' | 'tenant-home' | 'tenant-owner' | 'staff-details' | 'summary';
interface Unit { id: number; floor: string; number: string; }

@Component({
  selector: 'app-account-questionnaire',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ButtonComponent, CardComponent, InputComponent],
  templateUrl: './account-questionnaire.html',
  styleUrl: './account-questionnaire.scss',
})
export class AccountQuestionnaire {
  readonly roleOptions: { id: Role; title: string; description: string; icon: string }[] = [
    { id: 'owner', title: 'Propietario/a', description: 'Soy dueño/a de una o más unidades.', icon: '⌂' },
    { id: 'tenant', title: 'Inquilino/a', description: 'Alquilo una unidad en el edificio.', icon: '▣' },
    { id: 'staff', title: 'Personal del edificio', description: 'Trabajo en el edificio.', icon: '✦' },
  ];
  readonly staffFunctions = ['Encargado/a', 'Seguridad o portería', 'Limpieza', 'Mantenimiento', 'Administración', 'Otro'];
  readonly passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  current: Step = 'account';
  submitted = false;
  name = '';
  surname = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: Role | null = null;
  floor = '';
  unitNumber = '';
  livesHere: boolean | null = null;
  hasOtherUnits: boolean | null = null;
  otherUnits: Unit[] = [];
  hasRentedUnits: boolean | null = null;
  rentedUnits: number[] = [];
  rentalMethod: 'direct' | 'agency' | null = null;
  ownerLivesHere: boolean | null = null;
  ownerName = '';
  staffFunction = '';
  staffFunctionOther = '';
  staffSchedule = '';
  private unitSequence = 0;

  get currentSteps(): Step[] {
    if (!this.role) return ['account', 'role'];
    if (this.role === 'owner') return ['account', 'role', 'owner-info', 'owner-home', 'owner-units', 'summary'];
    if (this.role === 'tenant') return this.rentalMethod === 'direct'
      ? ['account', 'role', 'tenant-info', 'tenant-home', 'tenant-owner', 'summary']
      : ['account', 'role', 'tenant-info', 'tenant-home', 'summary'];
    return ['account', 'role', 'staff-details', 'summary'];
  }

  get progress(): number { return ((this.currentSteps.indexOf(this.current) + 1) / this.currentSteps.length) * 100; }
  get stepNumber(): number { return this.currentSteps.indexOf(this.current) + 1; }
  get emailValid(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()); }
  get accountValid(): boolean {
    return !!this.name.trim() && !!this.surname.trim() && this.emailValid &&
      this.passwordPattern.test(this.password) && this.confirmPassword === this.password;
  }
  get unitValid(): boolean { return !!this.floor.trim() && !!this.unitNumber.trim() && this.livesHere !== null; }
  get duplicateUnits(): boolean {
    const units = [{ floor: this.floor, number: this.unitNumber }, ...this.otherUnits];
    const keys = units.map(unit => this.unitAddressKey(unit));
    return keys.some((key, index) => !!key && keys.indexOf(key) !== index);
  }
  get ownerUnitsValid(): boolean {
    if (this.hasOtherUnits === null) return false;
    if (!this.hasOtherUnits) return true;
    return this.otherUnits.length > 0 && this.otherUnits.every(this.validUnit) && !this.duplicateUnits &&
      this.hasRentedUnits !== null && (!this.hasRentedUnits || (
        this.rentedUnits.length > 0 && this.rentedUnits.every(id => this.otherUnits.some(unit => unit.id === id))
      ));
  }

  chooseRole(role: Role): void {
    if (this.role !== role) {
      this.role = role;
      this.floor = ''; this.unitNumber = ''; this.livesHere = null;
      this.hasOtherUnits = null; this.otherUnits = []; this.hasRentedUnits = null; this.rentedUnits = [];
      this.rentalMethod = null; this.ownerLivesHere = null; this.ownerName = '';
      this.staffFunction = ''; this.staffFunctionOther = ''; this.staffSchedule = '';
    }
  }

  chooseHasOtherUnits(value: boolean): void {
    this.hasOtherUnits = value;
    if (!value) { this.otherUnits = []; this.hasRentedUnits = false; this.rentedUnits = []; }
    else if (!this.otherUnits.length) { this.otherUnits = [this.newUnit()]; this.hasRentedUnits = null; }
    this.pruneRentedUnits();
  }

  chooseRented(value: boolean): void {
    this.hasRentedUnits = value;
    if (!value) this.rentedUnits = [];
  }

  changeRentalMethod(value: 'direct' | 'agency'): void {
    this.rentalMethod = value;
    if (value === 'agency') { this.ownerLivesHere = null; this.ownerName = ''; }
  }

  chooseStaffFunction(value: string): void {
    if (this.staffFunction === 'Otro' && value !== 'Otro') this.staffFunctionOther = '';
    this.staffFunction = value;
  }

  addUnit(list: Unit[]): void { list.push(this.newUnit()); }
  removeUnit(list: Unit[], index: number): void { list.splice(index, 1); this.pruneRentedUnits(); }
  validUnit(unit: Unit): boolean { return !!unit.floor.trim() && !!unit.number.trim(); }
  unitAddressKey(unit: Pick<Unit, 'floor' | 'number'>): string {
    const floor = unit.floor.trim().toLocaleLowerCase();
    const number = unit.number.trim().toLocaleLowerCase();
    return floor && number ? `${floor}|${number}` : '';
  }
  isRented(unit: Unit): boolean { return this.rentedUnits.includes(unit.id); }
  toggleRentedUnit(unit: Unit): void {
    this.rentedUnits = this.isRented(unit) ? this.rentedUnits.filter(id => id !== unit.id) : [...this.rentedUnits, unit.id];
  }
  private pruneRentedUnits(): void {
    const validKeys = new Set(this.otherUnits.map(unit => unit.id));
    this.rentedUnits = this.rentedUnits.filter(key => validKeys.has(key));
  }
  private newUnit(): Unit { return { id: this.unitSequence++, floor: '', number: '' }; }
  otherUnitsText(): string { return this.otherUnits.map(unit => `Piso ${unit.floor}, unidad ${unit.number}`).join(' · '); }
  rentedUnitsText(): string { return this.otherUnits.filter(unit => this.isRented(unit)).map(unit => `Piso ${unit.floor}, unidad ${unit.number}`).join(' · '); }

  canContinue(): boolean {
    switch (this.current) {
      case 'account': return this.accountValid;
      case 'role': return !!this.role;
      case 'owner-home': return this.unitValid;
      case 'owner-units': return this.ownerUnitsValid;
      case 'tenant-home': return !!this.floor.trim() && !!this.unitNumber.trim() && this.rentalMethod !== null;
      case 'tenant-owner': return this.ownerLivesHere !== null && !!this.ownerName.trim();
      case 'staff-details': return !!this.staffFunction && (this.staffFunction !== 'Otro' || !!this.staffFunctionOther.trim());
      default: return true;
    }
  }

  next(): void {
    if (!this.canContinue()) { this.submitted = true; return; }
    this.submitted = false;
    const index = this.currentSteps.indexOf(this.current);
    this.current = this.currentSteps[Math.min(index + 1, this.currentSteps.length - 1)];
  }

  back(): void {
    const index = this.currentSteps.indexOf(this.current);
    if (index > 0) { this.current = this.currentSteps[index - 1]; this.submitted = false; }
  }

  restart(): void {
    this.current = 'account'; this.submitted = false;
    this.name = ''; this.surname = ''; this.email = ''; this.password = ''; this.confirmPassword = '';
    this.role = null; this.floor = ''; this.unitNumber = ''; this.livesHere = null; this.hasOtherUnits = null;
    this.otherUnits = []; this.hasRentedUnits = null; this.rentedUnits = []; this.rentalMethod = null;
    this.ownerLivesHere = null; this.ownerName = ''; this.staffFunction = ''; this.staffFunctionOther = ''; this.staffSchedule = '';
  }
}
