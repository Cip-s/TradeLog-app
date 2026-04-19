import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { View, Alert, FlatList } from "react-native";
import {
  Appbar,
  Button,
  Card,
  Dialog,
  Divider,
  IconButton,
  List,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";

export default function Budget() {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [formType, setFormType] = useState("out");
  const [formAmount, setFormAmount] = useState("0");
  const [formDescription, setFormDescription] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Gagal mengambil transaksi", error.message);
    } else {
      console.log(data);
      setTransactions(data);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalIn = transactions
    .filter((t) => t.type === "in")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = transactions
    .filter((t) => t.type === "out")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalIn - totalOut;

  async function handleAdd() {
    if (!formAmount || formAmount <= "0") {
      return Alert.alert("jumlah harus lebih dari 0");
    }
    if (!formDescription) {
      return Alert.alert("Deskripsi tidak boleh kosong");
    }
    const { error } = await supabase.from("transactions").insert({
      type: formType,
      amount: parseInt(formAmount),
      description: formDescription,
    });
    if (error) {
      Alert.alert("gagal menambahkan data transaksi", error.message);
    }
    setFormAmount("0");
    setFormDescription("");
    setFormType("out");
    setDialogVisible(false);
    fetchTransactions();
  }

  async function handleDelete(id: number) {
    Alert.alert("Hapus Transaksi", "Yakin ingin menghapus transaksi ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);

          if (error) {
            Alert.alert("Gagal menghapus transaksi", error.message);
          } else {
            fetchTransactions();
          }
        },
      },
    ]);
  }

  return (
    <View>
      <Appbar.Header>
        <Appbar.Content title="Budget" />
        <Appbar.Action
          icon="plus"
          onPress={() => {
            setDialogVisible(true);
          }}
        />
      </Appbar.Header>
      <Card style={{ margin: 16 }}>
        <Card.Content>
          <Text variant="labelSmall">Sisa saldo</Text>
          <Text variant="displaySmall" style={{ color: "green" }}>
            {formatRupiah(saldo)}
          </Text>
          <Divider style={{ marginVertical: 12 }}></Divider>
          <View
            style={{ flexDirection: "row", justifyContent: "space-around" }}
          >
            <View style={{ alignItems: "center" }}>
              <Text variant="labelSmall">Pemasukan</Text>
              <Text variant="titleSmall" style={{ color: "green" }}>
                {formatRupiah(totalIn)}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text variant="labelSmall">Pengeluaran</Text>
              <Text variant="titleSmall" style={{ color: "red" }}>
                {formatRupiah(totalOut)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      <View style={{ marginHorizontal: 16 }}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={item.description}
              descriptionStyle={{ color: "black" }}
              titleStyle={{ color: "black" }}
              description={new Date(item.created_at).toLocaleString()}
              left={() => (
                <List.Icon
                  icon={
                    item.type === "in" ? "arrow-up-circle" : "arrow-down-circle"
                  }
                  color={item.type === "in" ? "green" : "red"}
                />
              )}
              right={() => (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    variant="labelLarge"
                    style={{ color: item.type === "in" ? "green" : "red" }}
                  >
                    {item.type === "in" ? "+" : "-"} {formatRupiah(item.amount)}
                  </Text>
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    onPress={() => {
                      handleDelete(item.id);
                    }}
                  />
                </View>
              )}
            ></List.Item>
          )}
        />
      </View>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => {
            setDialogVisible(false);
          }}
        >
          <Dialog.Title>Tambah Transaksi</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={formType}
              onValueChange={(v) => {
                setFormType(v);
              }}
              buttons={[
                { value: "in", label: "Pemasukan", icon: "arrow-up-circle" },
                {
                  value: "out",
                  label: "Pengeluaran",
                  icon: "arrow-down-circle",
                },
              ]}
              style={{ marginBottom: 16 }}
            ></SegmentedButtons>

            <TextInput
              label={"Jumlah (Rp)"}
              keyboardType="numeric"
              value={formAmount}
              onChangeText={(v) => {
                setFormAmount(v);
              }}
              mode="outlined"
              style={{ marginBottom: 12 }}
            ></TextInput>

            <TextInput
              label={"Deskripsi"}
              value={formDescription}
              onChangeText={(v) => {
                setFormDescription(v);
              }}
              mode="outlined"
            ></TextInput>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDialogVisible(false);
              }}
            >
              Batal
            </Button>
            <Button
              onPress={() => {
                handleAdd();
              }}
              mode="contained"
            >
              Simpan
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
