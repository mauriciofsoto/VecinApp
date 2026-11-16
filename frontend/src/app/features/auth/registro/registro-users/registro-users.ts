import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { getDashboardUrl } from '../../../../core/guards/auth.guard';
import { CodigosInvitacionService, TokenAccesoComunidadResponse } from '../../../../core/services/codigos-invitacion.service';
import { RegistroComunitarioRequest } from '../../../../core/models/auth';
import { ButtonComponent } from '../../../../shared/components/atoms/button/button.component';
import { CardComponent } from '../../../../shared/components/atoms/card/card.component';
import { InputComponent } from '../../../../shared/components/atoms/input/input';

type Role = 'owner' | 'tenant' | 'staff';
type Step = 'account' | 'role' | 'owner-info' | 'owner-rentals' | 'owner-home' | 'owner-resident' | 'owner-units' | 'tenant-info' | 'tenant-home' | 'tenant-owner' | 'staff-details' | 'summary';
type Phase = 1 | 2 | 3 | 4;
interface Unit { id: number; floor: string; number: string; tenantName?: string; tenantSurname?: string; tenantFloor?: string; tenantUnit?: string; }

@Component({
  selector: 'app-registro-users',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, ButtonComponent, CardComponent, InputComponent],
  templateUrl: './registro-users.html',
  styleUrl: './registro-users.scss',
})
export class RegistroUsers implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly codigosInvitacion = inject(CodigosInvitacionService);
  private readonly authService = inject(AuthService);
  readonly identificadorPublico = signal<string | null>(null);
  readonly accesoComunitario = signal<TokenAccesoComunidadResponse | null>(null);
  readonly resolviendoAcceso = signal(false);
  readonly errorAcceso = signal('');

  readonly roleOptions: { id: Role; title: string; description: string; icon: string }[] = [
    { id: 'owner', title: 'Propietario/a', description: 'Soy dueño/a de una o más unidades.', icon: '⌂' },
    { id: 'tenant', title: 'Inquilino/a', description: 'Alquilo una unidad en el edificio.', icon: '▣' },
    { id: 'staff', title: 'Personal del edificio', description: 'Trabajo en el edificio.', icon: '✦' },
  ];
  readonly staffFunctions = ['Encargado/a', 'Seguridad o portería', 'Limpieza', 'Mantenimiento', 'Administración', 'Otro'];
  readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  readonly maxRentalUnits = 30;

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
  ownerHasRentalUnits: boolean | null = null;
  ownerResidenceLivesHere: boolean | null = null;
  rentalUnits: Unit[] = [];
  rentalMethod: 'direct' | 'agency' | null = null;
  ownerLivesHere: boolean | null = null;
  ownerName = '';
  ownerSurname = '';
  ownerFloor = '';
  ownerUnitNumber = '';
  staffFunction = '';
  staffFunctionOther = '';
  staffSchedule = '';
  private unitSequence = 0;
  submitting = false;
  submitError = '';
  registrationCreated = false;
  sessionReady = false;
  navigationFailed = false;
  retryAvailable = false;

  ngOnInit(): void {
    const identificador = this.route.snapshot.paramMap.get('identificadorPublico');
    if (!identificador) return;

    this.identificadorPublico.set(identificador);
    this.resolviendoAcceso.set(true);
    this.codigosInvitacion.resolverAccesoComunidad(identificador)
      .pipe(finalize(() => this.resolviendoAcceso.set(false)))
      .subscribe({
      next: acceso => this.accesoComunitario.set(acceso),
      error: err => this.errorAcceso.set(
        err?.error?.message ?? 'No se pudo obtener el acceso temporal del edificio.',
      ),
    });
  }

  get currentSteps(): Step[] {
    if (!this.role) return ['account', 'role'];
    if (this.role === 'owner') {
      const steps: Step[] = ['account', 'role', 'owner-info', 'owner-rentals'];
      if (this.ownerHasRentalUnits === true) {
        steps.push('owner-home', 'owner-units', 'summary');
      } else if (this.ownerHasRentalUnits === false) {
        steps.push('owner-resident', 'summary');
      }
      return steps;
    }
    if (this.role === 'tenant') return this.rentalMethod === 'direct'
      ? ['account', 'role', 'tenant-info', 'tenant-home', 'tenant-owner', 'summary']
      : ['account', 'role', 'tenant-info', 'tenant-home', 'summary'];
    return ['account', 'role', 'staff-details', 'summary'];
  }

  get phase(): Phase {
    if (this.current === 'account') return 1;
    if (this.current === 'role') return 2;
    if (this.current === 'summary') return 4;
    return 3;
  }
  get phaseLabel(): string {
    return ['Datos personales y cuenta', 'Tu relación con el edificio', 'Cuestionario según tu perfil', 'Resumen'][this.phase - 1];
  }
  get progress(): number { return this.phase * 25; }
  get stepNumber(): number { return this.phase; }
  get emailValid(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()); }
  get accountValid(): boolean {
    return !!this.name.trim() && !!this.surname.trim() && this.emailValid &&
      this.passwordPattern.test(this.password) && this.confirmPassword === this.password;
  }
  get ownerResidenceValid(): boolean {
    return this.ownerResidenceLivesHere !== null &&
      (this.ownerResidenceLivesHere === false || this.validUnit({ id: -1, floor: this.floor, number: this.unitNumber }));
  }
  get residentUnitValid(): boolean {
    return this.validUnit({ id: -1, floor: this.floor, number: this.unitNumber });
  }
  get duplicateUnits(): boolean {
    const units = [
      ...(this.ownerHasRentalUnits === true && this.ownerResidenceLivesHere === true
        ? [{ floor: this.floor, number: this.unitNumber }]
        : []),
      ...this.rentalUnits,
    ];
    const keys = units.map(unit => this.unitAddressKey(unit));
    return keys.some((key, index) => !!key && keys.indexOf(key) !== index);
  }
  get ownerUnitsValid(): boolean {
    return this.ownerHasRentalUnits === true && this.rentalUnits.length > 0 &&
      this.rentalUnits.every(unit => this.validUnit(unit)) && !this.duplicateUnits &&
      (this.ownerResidenceLivesHere !== true || this.validUnit({ id: -1, floor: this.floor, number: this.unitNumber }));
  }

  get finalProfile(): 'Propietario' | 'Inquilino' | 'Personal' | null {
    if (this.role === 'owner') return 'Propietario';
    if (this.role === 'tenant') return 'Inquilino';
    if (this.role === 'staff') return 'Personal';
    return null;
  }

  chooseRole(role: Role): void {
    if (this.role !== role) {
      this.role = role;
      this.floor = ''; this.unitNumber = ''; this.ownerHasRentalUnits = null;
      this.ownerResidenceLivesHere = null; this.rentalUnits = [];
      this.rentalMethod = null; this.ownerLivesHere = null; this.clearOwnerDetails();
      this.staffFunction = ''; this.staffFunctionOther = ''; this.staffSchedule = '';
    }
  }

  chooseOwnerHasRentalUnits(value: boolean): void {
    if (this.ownerHasRentalUnits === value) return;
    this.ownerHasRentalUnits = value;
    this.ownerResidenceLivesHere = null;
    this.rentalUnits = value ? [this.newUnit()] : [];
    this.floor = '';
    this.unitNumber = '';
  }

  chooseOwnerResidence(value: boolean): void {
    if (this.ownerResidenceLivesHere === value) return;
    this.ownerResidenceLivesHere = value;
    this.floor = '';
    this.unitNumber = '';
  }

  changeRentalMethod(value: 'direct' | 'agency'): void {
    this.rentalMethod = value;
    if (value === 'agency') { this.ownerLivesHere = null; this.clearOwnerDetails(); }
  }

  setOwnerLivesHere(value: boolean): void {
    this.ownerLivesHere = value;
    if (!value) { this.ownerFloor = ''; this.ownerUnitNumber = ''; }
  }

  chooseStaffFunction(value: string): void {
    if (this.staffFunction === 'Otro' && value !== 'Otro') this.staffFunctionOther = '';
    this.staffFunction = value;
  }

  addUnit(list: Unit[]): void {
    if (list.length < this.maxRentalUnits) list.push(this.newUnit());
  }
  removeUnit(list: Unit[], index: number): void { list.splice(index, 1); }
  validUnit(unit: Unit): boolean { return !!unit.floor.trim() && !!unit.number.trim(); }
  unitAddressKey(unit: Pick<Unit, 'floor' | 'number'>): string {
    const floor = this.normalizeUnitPart(unit.floor).toUpperCase();
    const number = this.normalizeUnitPart(unit.number).toUpperCase();
    return floor && number ? `${floor}|${number}` : '';
  }
  private normalizeUnitPart(value: string): string {
    return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  }
  private newUnit(): Unit { return { id: this.unitSequence++, floor: '', number: '', tenantName: '', tenantSurname: '', tenantFloor: '', tenantUnit: '' }; }
  private clearOwnerDetails(): void {
    this.ownerName = ''; this.ownerSurname = ''; this.ownerFloor = ''; this.ownerUnitNumber = '';
  }
  rentalUnitsText(): string { return this.rentalUnits.map(unit => `Piso ${unit.floor}, unidad ${unit.number}`).join(' · '); }

  canContinue(): boolean {
    switch (this.current) {
      case 'account': return this.accountValid;
      case 'role': return !!this.role;
      case 'owner-rentals': return this.ownerHasRentalUnits !== null;
      case 'owner-home': return this.ownerResidenceValid;
      case 'owner-resident': return this.residentUnitValid;
      case 'owner-units': return this.ownerUnitsValid;
      case 'tenant-home': return !!this.floor.trim() && !!this.unitNumber.trim() && this.rentalMethod !== null;
      case 'tenant-owner': return true;
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
    this.role = null; this.floor = ''; this.unitNumber = ''; this.ownerHasRentalUnits = null;
    this.ownerResidenceLivesHere = null; this.rentalUnits = []; this.rentalMethod = null;
    this.ownerLivesHere = null; this.clearOwnerDetails(); this.staffFunction = ''; this.staffFunctionOther = ''; this.staffSchedule = '';
    this.submitError = '';
  }

  submitRegistration(): void {
    if (this.submitting || this.registrationCreated || !this.role || !this.accesoComunitario()?.token) return;
    this.submitting = true;
    this.submitError = '';
    this.navigationFailed = false;
    this.retryAvailable = false;
    this.authService.registrarComunidad(this.buildRequest())
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: response => {
          this.registrationCreated = true;
          this.authService.login({ email: this.email.trim(), password: this.password }).subscribe({
            next: () => {
              this.sessionReady = true;
              window.setTimeout(() => {
                void this.navigateToDashboard();
              }, 2000);
            },
            error: error => {
              console.error('No se pudo iniciar sesión después del registro comunitario.', error);
              this.submitError = 'La cuenta fue creada, pero no pudimos iniciar tu sesión. Iniciá sesión con tu correo y contraseña.';
            },
          });
        },
        error: error => {
          const body = error?.error;
          const message = body?.message;
          const status = Number(error?.status);
          this.retryAvailable = status >= 400 && status < 500 && status !== 408 && status !== 409 &&
            !(typeof message === 'string' && message.toLocaleLowerCase().includes('ya existe'));
          const validationMessages = body?.errors && typeof body.errors === 'object'
            ? Object.values(body.errors).flat().filter((item): item is string => typeof item === 'string')
            : [];
          this.submitError = Array.isArray(message)
            ? message.join(' ')
            : message || validationMessages.join(' ') || 'No se pudo completar el registro. Revisá los datos e intentá nuevamente.';
        },
      });
  }

  async navigateToDashboard(): Promise<void> {
    if (!this.sessionReady) return;
    try {
      const navigated = await this.router.navigateByUrl(getDashboardUrl(this.authService));
      this.navigationFailed = !navigated;
    } catch (error) {
      console.error('Falló la navegación al dashboard después del registro comunitario.', error);
      this.navigationFailed = true;
    }
  }

  private buildRequest(): RegistroComunitarioRequest {
    const base: RegistroComunitarioRequest = {
      nombre: this.name.trim(), apellido: this.surname.trim(), email: this.email.trim(),
      password: this.password, tokenAcceso: this.accesoComunitario()!.token,
      perfil: this.finalProfile!,
      unidades: [],
    };

    if (this.role === 'owner') {
      if (this.ownerHasRentalUnits) {
        base.viveEnEdificio = this.ownerResidenceLivesHere;
        base.tieneOtrasUnidades = true;
        base.declaraUnidadesAlquiladas = true;
        base.unidades = [];
        if (this.ownerResidenceLivesHere) base.unidades.push({
          tipo: 'Residencia', piso: this.floor.trim(),
          identificacion: this.unitNumber.trim(), estaAlquilada: null, esPrincipal: true,
        });
        base.unidades.push(...this.rentalUnits.map(unit => ({
          tipo: 'Titularidad' as const, piso: unit.floor.trim(),
          identificacion: unit.number.trim(), estaAlquilada: true, esPrincipal: false,
          personaRelacionNombre: unit.tenantName?.trim() || undefined,
          personaRelacionApellido: unit.tenantSurname?.trim() || undefined,
          pisoRelacion: unit.tenantFloor?.trim() || undefined,
          identificacionRelacion: unit.tenantUnit?.trim() || undefined,
        })));
      } else {
        base.perfil = 'Propietario';
        base.viveEnEdificio = true;
        base.tieneOtrasUnidades = false;
        base.declaraUnidadesAlquiladas = false;
        base.unidades = [{
          tipo: 'Residencia', piso: this.floor.trim(), identificacion: this.unitNumber.trim(),
          estaAlquilada: null, esPrincipal: true,
        }];
      }
    } else if (this.role === 'tenant') {
      base.modalidadAlquiler = this.rentalMethod === 'direct' ? 'Directo' : 'InmobiliariaAdministracion';
      base.propietarioDeclaradoViveEnEdificio = this.rentalMethod === 'direct' ? this.ownerLivesHere : null;
      base.propietarioDeclaradoNombre = this.ownerName.trim() || null;
      base.propietarioDeclaradoApellido = this.ownerSurname.trim() || null;
      base.propietarioDeclaradoPiso = this.ownerFloor.trim() || null;
      base.propietarioDeclaradoUnidad = this.ownerUnitNumber.trim() || null;
      base.unidades = [{
        tipo: 'Ocupacion', piso: this.floor.trim() || null,
        identificacion: this.unitNumber.trim() || null, estaAlquilada: null,
        personaRelacionNombre: this.ownerName.trim() || null,
        personaRelacionApellido: this.ownerSurname.trim() || null,
        pisoRelacion: this.ownerLivesHere === true ? this.ownerFloor.trim() || null : null,
        identificacionRelacion: this.ownerLivesHere === true ? this.ownerUnitNumber.trim() || null : null,
      }];
    } else {
      base.funcionPersonal = this.staffFunction;
      base.funcionPersonalOtra = this.staffFunction === 'Otro' ? this.staffFunctionOther.trim() : null;
      base.horarioPersonal = this.staffSchedule.trim() || null;
    }
    return base;
  }
}
