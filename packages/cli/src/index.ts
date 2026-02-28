#!/usr/bin/env bun
import { Command } from "commander";
import { ejectCommand } from "./eject";

const program = new Command();

program
  .name("zenku")
  .description("Zenku CLI — scaffold and eject entity pages")
  .version("0.0.1");

program.addCommand(ejectCommand);

program.parse();
