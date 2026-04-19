import { Alert, View, ScrollView } from "react-native";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import {
  Appbar,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  IconButton,
  List,
  Portal,
  RadioButton,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";

type Student = {
  id: number;
  name: string;
  kelas: string;
};

type Attendance = {
  id: number;
  student_id: number;
  status: "hadir" | "sakit" | "izin" | "alfa";
  keterangan: string |  null;
  tanggal: string;
  jam_masuk: string | null;
  students: Student;
};

const STATUS_COLOR = {
  hadir: "#16a34a",
  sakit: "#dc2626",
  izin: "#d97706",
  alfa: "#6b7280",
};

const STATUS_ICON = {
  hadir: "check-circle",
  sakit: "medical-bag",
  izin: "file-document-outline",
  alfa: "close-circle",
};

export default function Absensi() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [showAbsenDialog, setShowAbsenDialog] = useState(false);
  const [showSiswaDialog, setShowSiswaDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("semua");

  // Form absensi
  const [pilihanSiswa, setPilihanSiswa] = useState<number | null>(null);
  const [status, setStatus] = useState<"hadir" | "sakit" | "izin" | "alfa">(
    "hadir",
  );
  const [keterangan, setKeterangan] = useState("");

  // Form tambah siswa
  const [namaSiswa, setNamaSiswa] = useState("");
  const [kelasSiswa, setKelasSiswa] = useState("");

  // Hitung statistik hari ini
  const hari_ini = new Date().toISOString().split("T")[0];
  const absensiHariIni = Array.isArray(attendance)
    ? attendance.filter((a) => a.tanggal === hari_ini)
    : [];
  const jumlahHadir = absensiHariIni.filter((a) => a.status === "hadir").length;
  const jumlahTidakHadir = absensiHariIni.filter(
    (a) => a.status !== "hadir",
  ).length;

  // Filter daftar absensi
  const daftarAbsensi = !Array.isArray(attendance)
    ? []
    : filterStatus === "semua"
      ? attendance
      : attendance.filter((a) => a.status === filterStatus);

  function formatTanggal(tgl: string) {
    return new Date(tgl).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Ambil data siswa dari Supabase
  async function ambilSiswa() {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("name", { ascending: true });
    if (data) setStudents(data);
  }

  // Ambil data absensi dari Supabase
  async function ambilAbsensi() {
    const { data: dataAbsen } = await supabase
      .from("attendance")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: dataSiswa } = await supabase.from("students").select("*");

    if (dataAbsen && dataSiswa) {
      // Gabungkan data absensi dengan data siswa
      const hasil = dataAbsen.map((a: any) => ({
        ...a,
        students: dataSiswa.find((s: any) => s.id === a.student_id) ?? null,
      }));
      setAttendance(hasil);
    }
  }

  useEffect(() => {
    ambilSiswa();
    ambilAbsensi();
  }, []);

  // Simpan absensi baru
  async function simpanAbsensi() {
    if (!pilihanSiswa) {
      return Alert.alert("Error", "Pilih siswa terlebih dahulu");
    }

    // Cek kalau siswa sudah diabsen hari ini
    const sudahAbsen = attendance.find(
      (a) => a.student_id === pilihanSiswa && a.tanggal === hari_ini,
    );
    if (sudahAbsen) {
      return Alert.alert("Info", "Siswa ini sudah diabsen hari ini");
    }

    const jamSekarang = new Date().toTimeString().slice(0, 8);

    const { error } = await supabase.from("attendance").insert({
      student_id: pilihanSiswa,
      status: status,
      keterangan: keterangan || null,
      tanggal: hari_ini,
      jam_masuk: status === "hadir" ? jamSekarang : null,
    });

    if (error) return Alert.alert("Error", error.message);

    // Reset form
    setPilihanSiswa(null);
    setStatus("hadir");
    setKeterangan("");
    setShowAbsenDialog(false);
    ambilAbsensi();
  }

  // Tambah siswa baru
  async function tambahSiswa() {
    if (!namaSiswa.trim())
      return Alert.alert("Error", "Nama tidak boleh kosong");
    if (!kelasSiswa.trim())
      return Alert.alert("Error", "Kelas tidak boleh kosong");

    const { error } = await supabase.from("students").insert({
      name: namaSiswa.trim(),
      kelas: kelasSiswa.trim(),
    });

    if (error) return Alert.alert("Error", error.message);

    setNamaSiswa("");
    setKelasSiswa("");
    setShowSiswaDialog(false);
    ambilSiswa();
    Alert.alert("Berhasil", "Siswa berhasil ditambahkan");
  }

  // Hapus data absensi
  async function hapusAbsensi(id: number) {
    Alert.alert("Hapus Absensi", "Yakin ingin menghapus?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("attendance")
            .delete()
            .eq("id", id);
          if (error) Alert.alert("Gagal", error.message);
          else ambilAbsensi();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <Appbar.Header>
        <Appbar.Content title="Absensi" />
        <Appbar.Action
          icon="account-plus"
          onPress={() => setShowSiswaDialog(true)}
        />
        <Appbar.Action icon="plus" onPress={() => setShowAbsenDialog(true)} />
      </Appbar.Header>

      <ScrollView style={{ flex: 1 }}>
        {/* Judul */}
        <View style={{ padding: 16 }}>
          <Text variant="labelSmall" style={{ color: "#888" }}>
            DASHBOARD
          </Text>
          <Text variant="headlineMedium" style={{ fontWeight: "bold" }}>
            Absensi Siswa
          </Text>
          <Text variant="bodySmall" style={{ color: "#888" }}>
            {formatTanggal(hari_ini)}
          </Text>
        </View>

        {/* Kartu Statistik */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Card
            style={{ flex: 1, backgroundColor: "#5c5f6e", borderRadius: 16 }}
          >
            <Card.Content style={{ paddingVertical: 20 }}>
              <Text
                variant="labelSmall"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                Total Kehadiran
              </Text>
              <Text
                variant="displaySmall"
                style={{ color: "white", fontWeight: "bold" }}
              >
                {absensiHariIni.length}
              </Text>
              <Text
                variant="labelSmall"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                records
              </Text>
            </Card.Content>
          </Card>

          <View style={{ flex: 1, gap: 12 }}>
            <Card style={{ backgroundColor: "#dcfce7", borderRadius: 16 }}>
              <Card.Content style={{ paddingVertical: 14 }}>
                <Text variant="labelSmall" style={{ color: "#16a34a" }}>
                  Jumlah Masuk
                </Text>
                <Text
                  variant="headlineMedium"
                  style={{ color: "#16a34a", fontWeight: "bold" }}
                >
                  {jumlahHadir}
                </Text>
              </Card.Content>
            </Card>

            <Card style={{ backgroundColor: "#fee2e2", borderRadius: 16 }}>
              <Card.Content style={{ paddingVertical: 14 }}>
                <Text variant="labelSmall" style={{ color: "#dc2626" }}>
                  Jumlah Tidak
                </Text>
                <Text
                  variant="headlineMedium"
                  style={{ color: "#dc2626", fontWeight: "bold" }}
                >
                  {jumlahTidakHadir}
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 16, marginBottom: 8 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["semua", "hadir", "sakit", "izin", "alfa"].map((s) => (
              <Chip
                key={s}
                selected={filterStatus === s}
                onPress={() => setFilterStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Chip>
            ))}
          </View>
        </ScrollView>

        {/* Daftar Absensi */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            History Absensi
          </Text>
        </View>

        {daftarAbsensi.length === 0 ? (
          <View style={{ alignItems: "center", padding: 32 }}>
            <Text style={{ color: "#888" }}>Belum ada data absensi</Text>
          </View>
        ) : (
          daftarAbsensi.map((item) => (
            <Card
              key={item.id}
              style={{
                marginHorizontal: 16,
                marginBottom: 10,
                borderRadius: 14,
                borderLeftWidth: 4,
                borderLeftColor: STATUS_COLOR[item.status],
              }}
            >
              <Card.Content
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
                    {item.students?.name ?? "—"}
                  </Text>
                  <Text variant="bodySmall" style={{ color: "#555" }}>
                    Kelas {item.students?.kelas ?? "—"}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                      gap: 8,
                    }}
                  >
                    <Chip
                      icon={STATUS_ICON[item.status]}
                      style={{
                        backgroundColor: STATUS_COLOR[item.status] + "22",
                      }}
                      textStyle={{
                        color: STATUS_COLOR[item.status],
                        fontSize: 11,
                      }}
                      compact
                    >
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
                    </Chip>
                    <Text variant="labelSmall" style={{ color: "#888" }}>
                      {formatTanggal(item.tanggal)}
                    </Text>
                  </View>
                  {item.jam_masuk && (
                    <Text
                      variant="labelSmall"
                      style={{ color: "#555", marginTop: 2 }}
                    >
                      🕐 Jam masuk: {item.jam_masuk.slice(0, 5)}
                    </Text>
                  )}
                  {item.keterangan && (
                    <Text
                      variant="labelSmall"
                      style={{ color: "#888", marginTop: 2 }}
                    >
                      📝 {item.keterangan}
                    </Text>
                  )}
                </View>
                <IconButton
                  icon="delete-outline"
                  size={18}
                  onPress={() => hapusAbsensi(item.id)}
                />
              </Card.Content>
            </Card>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Dialog Tambah Absensi */}
      <Portal>
        <Dialog
          visible={showAbsenDialog}
          onDismiss={() => setShowAbsenDialog(false)}
        >
          <Dialog.Title>Tambah Absensi</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 420 }}>
            <ScrollView>
              <Text
                variant="labelMedium"
                style={{ marginTop: 8, marginBottom: 4 }}
              >
                Pilih Siswa
              </Text>
              {students.map((s) => (
                <List.Item
                  key={s.id}
                  title={s.name}
                  description={`Kelas ${s.kelas}`}
                  left={() => (
                    <RadioButton
                      value={s.id.toString()}
                      status={pilihanSiswa === s.id ? "checked" : "unchecked"}
                      onPress={() => setPilihanSiswa(s.id)}
                    />
                  )}
                  onPress={() => setPilihanSiswa(s.id)}
                  style={{
                    backgroundColor:
                      pilihanSiswa === s.id ? "#eff6ff" : "transparent",
                    borderRadius: 8,
                  }}
                />
              ))}

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                Status Kehadiran
              </Text>
              <SegmentedButtons
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "hadir" | "sakit" | "izin" | "alfa")
                }
                buttons={[
                  { value: "hadir", label: "Hadir" },
                  { value: "sakit", label: "Sakit" },
                  { value: "izin", label: "Izin" },
                  { value: "alfa", label: "Alfa" },
                ]}
                style={{ marginBottom: 12 }}
              />

              {status !== "hadir" && (
                <TextInput
                  label="Keterangan (opsional)"
                  value={keterangan}
                  onChangeText={setKeterangan}
                  mode="outlined"
                  placeholder={
                    status === "sakit"
                      ? "Contoh: demam"
                      : status === "izin"
                        ? "Contoh: acara keluarga"
                        : "Contoh: tidak ada kabar"
                  }
                  style={{ marginBottom: 8 }}
                />
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowAbsenDialog(false)}>Batal</Button>
            <Button onPress={simpanAbsensi}>Simpan</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog Tambah Siswa */}
      <Portal>
        <Dialog
          visible={showSiswaDialog}
          onDismiss={() => setShowSiswaDialog(false)}
        >
          <Dialog.Title>Tambah Siswa</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nama Siswa"
              value={namaSiswa}
              onChangeText={setNamaSiswa}
              mode="outlined"
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Kelas (contoh: X, XI IPA, XII IPS)"
              value={kelasSiswa}
              onChangeText={setKelasSiswa}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSiswaDialog(false)}>Batal</Button>
            <Button onPress={tambahSiswa}>Tambah</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
