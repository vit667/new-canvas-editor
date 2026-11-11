# Реестр инфраструктуры: модель данных

Статус: черновик v0.1 · 2026-11-11
Назначение: общая основа для схем, CMDB, IPAM, импорта конфигов и связей «чем мониторится / бэкапится / управляется».

## 1. Зачем

Сейчас всё живёт в узлах схемы (`node.data`): карточка — это и объект, и его картинка. Из-за этого нельзя:

- видеть все подсети и адреса, а не только нарисованные (IPAM);
- знать занятость портов устройства независимо от линий на холсте;
- держать одну ВМ на нескольких схемах и править её в одном месте;
- описывать связи между объектами («Zabbix мониторит эту ВМ»), а не подписи на карточках.

Решение: **реестр объектов со связями**. Схема, CMDB, IPAM, таблицы — разные представления одного реестра.

```
          ┌──────────── Представления ────────────┐
          │ Схемы (холст) · CMDB · IPAM · Порты    │
          │ Импорт · Поиск · Отчёты                 │
          └───────────────────┬────────────────────┘
                              │ читают/пишут только через репозиторий
                    ┌─────────▼─────────┐
                    │ InventoryRepository│  ← валидация, индексы, события
                    └─────────┬─────────┘
               ┌──────────────┴──────────────┐
        LocalAdapter (сейчас)          ServerAdapter (потом)
   zustand + localStorage + WS      REST/WS + БД (PostgreSQL)
```

## 2. Принятые допущения (пересмотреть по мере решений)

| Вопрос | Допущение сейчас | Что сделано, чтобы не пожалеть |
|---|---|---|
| Где живут данные | В браузере (localStorage) + текущая WS-синхронизация | Весь доступ — через `InventoryRepository`; сервер подключается адаптером без переписывания UI |
| Отдельный продукт или часть team | Модуль внутри canvas-editor | Модель без зависимостей от React/React Flow — переносится в `team/webapp` как есть |
| Импорт | Только вставка текста и файлы | Парсеры — чистые функции `text → ImportResult`; живой опрос (SSH/SNMP/API) потом станет ещё одним источником текста |

## 3. Общие поля всех объектов

```ts
interface Entity {
  id: string;            // ULID, стабильный, не меняется
  kind: EntityKind;      // см. ниже
  name: string;          // отображаемое имя
  tags?: string[];
  description?: string;
  status?: 'planned' | 'active' | 'maintenance' | 'retired';
  owner?: string;
  custom?: Record<string, string>;   // свои поля
  source?: { type: 'manual' | 'import'; ref?: string; at?: string }; // откуда взялось
  createdAt: string; updatedAt: string;
}
```

## 4. Объекты

### 4.1 Размещение
| kind | Поля | Комментарий |
|---|---|---|
| `site` | address, timezone | площадка / офис / ЦОД |
| `rack` | siteId, units (42), position | стойка |

### 4.2 Физика
| kind | Поля |
|---|---|
| `device` | role (`router` `switch` `firewall` `server` `storage` `ap` `endpoint` `ups`…), vendor, model, **serial**, assetTag, platform/OS + version, rackId + unit, **stack**: `{ stackId, member, priority }`, mgmtIpId, ciIcon |
| `module` | deviceId, slot, model, serial (блоки питания, линейные карты, трансиверы SFP) |
| `interface` | deviceId, name (`Gi1/0/1`, `ether1`), type (`rj45` `sfp` `sfp+` `qsfp` `virtual` `lag` `wireless`), speed, mtu, **mode** (`access` `trunk` `routed`), untaggedVlanId, taggedVlanIds[], lagId, enabled, mac, description |
| `cable` | aInterfaceId, bInterfaceId, type (`cat6` `om4` `dac` `wireless`), length, label |

Правило: у интерфейса не больше одного кабеля. «Свободный порт» = `enabled` и нет кабеля.

### 4.3 Сеть
| kind | Поля |
|---|---|
| `vrf` | rd, description. Глобальная таблица = VRF `default` |
| `vlan` | vid (1–4094), name, color, siteId? (область видимости) |
| `prefix` | cidr, vrfId, vlanId?, parentId (вычисляется), role (`lan` `dmz` `mgmt` `transit` `p2p` `public` `container`), gateway, dhcpRanges[], reserved[], isPool |
| `ipAddress` | address (без маски), prefixId (вычисляется), vrfId, interfaceId?, role (`primary` `secondary` `vip` `anycast` `gateway`), dnsName, status |
| `natRule` | type (`dnat` `snat` `static` `masquerade`), outside: `{ ipId?, cidr?, ports }`, inside: `{ ipId, ports }`, protocol, deviceId (где правило), description |
| `flow` | srcEntityId, dstEntityId, dstPort, protocol, observedBy (`ss` `netstat` `firewall` `manual`), firstSeen, lastSeen, count |

### 4.4 Вычисления и платформа
| kind | Поля |
|---|---|
| `cluster` | type (`vcenter` `proxmox` `nutanix` `kvm` `k8s` `hyperv`), managerUrl |
| `host` | deviceId (физический сервер), clusterId, hypervisor + version |
| `vm` | hostId / clusterId, vcpu, ramMb, disks[], os + version, vmid (`CT 152`, `VM 106`), template? |
| `container` | runtime (`lxc` `docker` `k8s-pod`), parent (vm/host), image |
| `datastore` | type (`vmfs` `nfs` `ceph` `zfs` `san-lun`), capacity, used, storageDeviceId |

### 4.5 Программное
| kind | Поля |
|---|---|
| `software` | product (каталог), version, edition, installPath, **runsOnId** (vm / host / container / device), listenPorts[], **role**: `database` `runtime` `webserver` `agent` `exporter` `backup-agent` `remote-access` `app` |
| `dbInstance` | softwareId, engine (`oracle` `postgres` `mariadb` `mssql` `mongo`…), sid/port, databases[] |
| `service` | бизнес-сервис / приложение: url, criticality, slaHours |
| `external` | внешняя система / SaaS / облако: provider, url, contract |

Каталог продуктов (`product`) — справочник с иконкой (`si:` / `ci:` / `img:`) и категорией: мониторинг (Zabbix, Prometheus, Grafana, exporters), бэкап (Veeam, Proxmox Backup, Borg), управление (Ansible, Terraform, GitLab, GitHub), удалённый доступ (RDP/RDS, AnyDesk, TeamViewer), безопасность (PAM, SIEM, XDR, EDR), СУБД, рантаймы (Java, Node.js, .NET, Python).

## 5. Связи

Одна таблица `relation { id, type, fromId, toId, props }`. Типы:

| type | from → to | Пример |
|---|---|---|
| `contains` | site→rack, rack→device, cluster→host, host→vm, vm→container | вложенность (дерево CMDB) |
| `runs_on` | software/dbInstance/service → vm/host/container | Oracle на ВМ |
| `depends_on` | service → service/software/external | приложение → БД |
| `monitored_by` | любой → software (role agent/exporter) или service (Zabbix) | ВМ → Zabbix, props: `{ via: 'node_exporter' }` |
| `backed_up_by` | vm/dbInstance/datastore → software/service (Veeam) | props: `{ schedule, retention, target }` |
| `managed_by` | любой → software/service (Ansible, Terraform, PAM) | props: `{ method: 'ssh' \| 'winrm' \| 'api' }` |
| `accessed_via` | любой → software (AnyDesk, RDP, TeamViewer, PAM) | |
| `logs_to` | любой → service (SIEM) | |
| `talks_to` | любой → любой | из `flow`, props: `{ port, protocol }` |

`cable`, `natRule`, `flow` — отдельные объекты, потому что у них свои поля и история.

## 6. Правила проверки (валидация в репозитории)

### IPAM
1. **CIDR корректен** и нормализован (`10.0.10.5/24` → предупреждение «хост-биты», предложить `10.0.10.0/24`).
2. **Пересечение подсетей** запрещено в одном VRF, кроме строгой вложенности (родитель ⊃ ребёнок). Частичное пересечение — ошибка всегда.
3. Родитель вычисляется как **наименьшая** подсеть того же VRF, полностью содержащая данную; при добавлении/удалении дети перепривязываются.
4. **Шлюз** ∈ подсети, не network/broadcast (кроме /31, /32).
5. **IP-адрес** уникален в VRF; должен попадать в существующую подсеть (иначе предупреждение «вне IPAM»); не попадает в чужой DHCP-диапазон без пометки `dhcp`.
6. Подсеть с `vlanId` — VLAN должен существовать и (если задан `siteId`) быть на той же площадке.
7. Удаление подсети с адресами — только с явным выбором: перенести адреса в родителя или удалить.

Вычисляемые поля для UI: utilization %, свободные диапазоны (список `[start, end]`), «следующий свободный адрес», «следующая свободная подсеть /N внутри».

### Порты и кабели
8. Один кабель на интерфейс.
9. Предупреждения (не ошибки): несовпадение типа (`sfp+` ↔ `rj45`), скорости, режима (`access` ↔ `trunk`), отключённый интерфейс, разные untagged VLAN на концах access-линка.

### NAT
10. Внешний `ip:port/proto` уникален на устройстве; inside-адрес существует в IPAM.
11. Таблица «Open to the internet» = все `dnat` с публичным outside.

### Устройства
12. `serial` уникален глобально (повторный импорт обновляет, а не дублирует — ключ сопоставления: serial → mgmt IP → hostname).
13. Имя — по шаблону площадки (настраиваемый regex, напр. `^(?<site>[a-z]{3})-(?<role>sw|rt|fw)-(?<n>\d{2})$`); несоответствие — предупреждение с предложением имени.

## 7. Схемы как представления

```ts
interface Diagram {
  id: string; name: string; style: 'default' | 'blueprint';
  items: { entityId: string; x: number; y: number; w?: number; h?: number; parentItemId?: string; collapsed?: boolean }[];
  links: { relationOrCableId: string; routing?: 'step' | 'bezier' | 'straight'; centerX?: number; centerY?: number; labelAt?: … }[];
  annotations: Node[]; // чисто картиночные узлы: легенда, заметки, таблицы-надписи
}
```

- Карточка на холсте показывает данные объекта; правка в редакторе узла правит объект в реестре.
- Один объект может быть на многих схемах; удаление со схемы ≠ удаление из реестра.
- Слои на схеме: «физика (кабели)», «L2/VLAN», «L3/маршруты», «мониторинг», «бэкап», «управление», «потоки (flow)» — включаются независимо.

## 8. Импорт

Парсер: `parse(text, hint?) → ImportResult { entities[], relations[], warnings[] }`. Затем экран сверки: «новое / изменилось / без изменений», применяется выбранное.

| Источник | Что извлекаем |
|---|---|
| Cisco IOS/IOS-XE/NX-OS: `show running-config`, `show version`, `show inventory`, `show interfaces status`, `show cdp/lldp neighbors detail`, `show switch` (стек) | hostname, модель, SN всех членов стека и модулей, интерфейсы (mode, VLAN, описание, LAG), SVI + IP, соседи → кабели |
| Huawei VRP: `display current-configuration`, `display device`, `display elabel`, `display lldp neighbor brief` | то же |
| Aruba AOS-CX / AOS-S: `show running-config`, `show system`, `show lldp neighbor-info` | то же |
| Palo Alto: XML конфиг / `show system info`, `show interface all` | зоны, интерфейсы, IP, **NAT-правила**, security rules (позже) |
| MikroTik: `/export`, `/system routerboard print` | интерфейсы, bridge VLAN, IP, NAT |
| Linux `ss -tunap` / Windows `netstat -ano`, `Get-NetTCPConnection` | слушающие порты → `software.listenPorts`; установленные → `flow` |
| Linux `ip -j addr`, `lsblk -J`, `systemctl list-units`, `dpkg -l` / `rpm -qa` | IP, диски, сервисы, ПО |
| VMware: **RVTools xlsx** (vInfo, vHost, vCluster, vDatastore, vNetwork) | весь парк vCenter → кластеры, хосты, ВМ, datastores, порт-группы |
| Proxmox: `pvesh get /cluster/resources --output-format json` | ноды, ВМ/CT, storage |

## 9. Порядок реализации

| Этап | Содержание | Зависит от |
|---|---|---|
| 0 | Модель + `InventoryRepository` + LocalAdapter; миграция текущих blueprint-узлов в объекты (узел получает `entityId`) — **сделано** (см. §10) | — |
| 1 | CI-иконки, «Интернет/облако», внешние системы — **сделано** | — |
| 2 | IPAM: дерево подсетей, занятость, свободные диапазоны, проверки §6 — **сделано**: `lib/inventory/ipam.ts`, правила в `validation.ts`, страница `/ipam` (дерево по VRF, карта адресов, следующий свободный IP и подсеть, формы с проверкой на лету). IPv6 — позже | 0 |
| 3 | Порты: выбор свободного порта при соединении, предупреждения §6.9 | 0 |
| 4 | Импорт: Cisco, Huawei, Aruba, Palo Alto, MikroTik, ss/netstat, RVTools, Proxmox | 0, 2, 3 |
| 5 | Виртуализация и ПО, связи monitored/backed/managed, слои на схеме | 0 |
| 6 | NAT, потоки, трассировка пути | 2, 4 |
| 7 | app-shell-12 (каркас с разделами) + новый CMDB-проводник — **сделано**: меню «Проектирование / Реестр / Данные», маршруты `/schemes`, `/inventory/[раздел]`, `/issues`, таблицы разделов с фильтром по схеме и правкой в ячейке | 0 |

## 10. Реализация этапа 0

| Файл | Что внутри |
|---|---|
| `lib/inventory/types.ts` | виды объектов, поля по видам (`AttrsMap`), связи, пакет изменений |
| `lib/inventory/repository.ts` | `createInventory(storage)`: атомарный `apply`, каскадное удаление (устройство → интерфейсы, модули, IP; интерфейс → кабели), индексы связей, подписка |
| `lib/inventory/validation.ts` | правила: концы связей, циклы вложенности, один кабель на интерфейс, уникальный серийник, VID 1–4094, синтаксис CIDR и IP, уникальный IP в VRF. Ошибки, касающиеся изменённого, откатывают пакет; старые ошибки работу не блокируют |
| `lib/inventory/local-adapter.ts` | хранилище в `localStorage` (`inventory-v1`, запись с задержкой 250 мс); общий экземпляр `getInventory()` |
| `lib/inventory/hooks.ts` | `useEntities`, `useEntity`, `useRelations`, `useInventoryIssues` |
| `lib/inventory/diagram-sync.ts` | схема ↔ реестр (ниже) |
| `hooks/useInventorySync.ts` | миграция всех проектов при запуске, синхронизация открытой схемы (400 мс), перенос правок на другие схемы |
| `components/canvas/InventoryView.tsx` | представление «Реестр»: виды, таблица, карточка объекта (поля, связи, схемы), проблемы, «На текущую схему» |

Как схема отображается в реестр:

| Узел | Объекты | Связи |
|---|---|---|
| Устройство | `device` + `ipAddress` | |
| Коммутатор | `device` + `interface` на каждый порт + `ipAddress` | порт↔порт → `cable`; порт↔узел → `connected_to` от интерфейса |
| Секция | `group` + `ipAddress` | вложенность → `contains` |
| Сервис | `service` (+ `ipAddress`, если под бейджем IP) | строки стека → `software` `runs_on` сервис |
| Интернет / облако | `external` | |
| Внешние системы | `external` на каждую строку | связь к строке → к её объекту |
| Сети | `vlan` + `prefix` на каждую сеть | |
| Легенда, таблица, характеристики | — (надписи) | |

Правила: удаление узла со схемы не удаляет объект; копия узла (клон, вставка) — новый объект; порты, удалённые из коммутатора на схеме, удаляются (это части устройства); кабели и связи, выведенные из схемы, удаляются вместе со связью на схеме, если их не рисует другая схема (`source.refs`).

## 11. Открытые вопросы

1. Сервер и БД: когда нужен многопользовательский режим и история изменений (аудит)?
2. Живой опрос (SSH/SNMP/vCenter API): нужен ли, и где хранить учётные данные (vault/PAM)?
3. Слияние с ITSM/CMDB в `team/webapp`: один реестр на оба продукта?
4. Права доступа: по площадкам / по ролям?
